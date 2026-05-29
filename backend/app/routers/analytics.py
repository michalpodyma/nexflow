from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.assignments import Assignment
from app.models.candidates import Candidate
from app.models.clients import Client
from app.models.compliance import ComplianceAlert
from app.models.enums import AttendanceStatus, JobOrderStatus, ScreeningStatus
from app.models.job_orders import JobOrder
from app.models.prospects import Prospect
from app.models.workers import Worker

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


class PipelineStageCount(BaseModel):
    status: str
    count: int


class WeeklyTrend(BaseModel):
    week_start: str  # ISO date YYYY-MM-DD
    new_candidates: int


class AnalyticsOverview(BaseModel):
    active_workers: int
    placement_rate: float  # hired / total candidates (0.0–1.0)
    pipeline_velocity: int  # new candidates in last 7 days
    revenue_forecast_monthly_pln: float  # active workers × avg employer_rate × 22 days
    pipeline_by_stage: list[PipelineStageCount]
    weekly_trends: list[WeeklyTrend]  # last 8 weeks
    computed_at: str  # ISO datetime


class PlacementsByMonth(BaseModel):
    month: str  # YYYY-MM
    count: int


class ComplianceSummary(BaseModel):
    expiring_7d: int
    expiring_30d: int
    expiring_90d: int


class RecruiterAnalytics(BaseModel):
    active_workers: int
    placement_rate: float
    fill_rate: float  # headcount_filled / headcount_needed across all job orders
    avg_time_to_fill_days: float | None  # avg days from job order creation to filled
    placements_by_month: list[PlacementsByMonth]  # last 6 months
    compliance_summary: ComplianceSummary
    weekly_trends: list[WeeklyTrend]  # last 8 weeks
    computed_at: str


class RevenuePerClient(BaseModel):
    client_name: str
    revenue_monthly_pln: float


class ProspectFunnelCount(BaseModel):
    status: str
    count: int


class B2BAnalytics(BaseModel):
    revenue_forecast_monthly_pln: float
    pipeline_velocity: int
    pipeline_value_pln: float  # sum of estimated_monthly_value for open prospects
    conversion_rate: float  # converted / total prospects (0.0–1.0)
    revenue_per_client: list[RevenuePerClient]  # top 10
    pipeline_by_stage: list[PipelineStageCount]  # candidate pipeline stages
    prospects_funnel: list[ProspectFunnelCount]
    computed_at: str


@router.get("/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AnalyticsOverview:
    now = datetime.now(UTC)

    # Active workers: workers with attendance_status = 'active'
    active_workers_result = await db.execute(
        select(func.count())
        .select_from(Worker)
        .where(Worker.attendance_status == AttendanceStatus.active)
    )
    active_workers: int = active_workers_result.scalar_one()

    # Placement rate: hired candidates / total candidates
    total_result = await db.execute(select(func.count()).select_from(Candidate))
    total_candidates: int = total_result.scalar_one()

    hired_result = await db.execute(
        select(func.count())
        .select_from(Candidate)
        .where(Candidate.screening_status == ScreeningStatus.hired)
    )
    hired: int = hired_result.scalar_one()
    placement_rate = (hired / total_candidates) if total_candidates > 0 else 0.0

    # Pipeline velocity: new candidates created in the past 7 days
    week_ago = now - timedelta(days=7)
    velocity_result = await db.execute(
        select(func.count())
        .select_from(Candidate)
        .where(Candidate.created_at >= week_ago)
    )
    pipeline_velocity: int = velocity_result.scalar_one()

    # Revenue forecast: active workers × avg employer_rate of active assignments × 22 days/month
    avg_rate_result = await db.execute(
        select(func.avg(Assignment.employer_rate))
        .join(Worker, Assignment.worker_id == Worker.id)
        .where(
            Worker.attendance_status == AttendanceStatus.active,
            Assignment.is_active == True,  # noqa: E712
        )
    )
    avg_rate = avg_rate_result.scalar_one() or 0.0
    revenue_forecast_monthly_pln = float(active_workers) * float(avg_rate) * 22.0

    # Candidate breakdown by pipeline stage
    stage_result = await db.execute(
        select(Candidate.screening_status, func.count().label("cnt"))
        .group_by(Candidate.screening_status)
        .order_by(func.count().label("cnt").desc())
    )
    pipeline_by_stage = [
        PipelineStageCount(status=row[0], count=row[1])
        for row in stage_result.all()
    ]

    # Weekly trend: candidate intake per week for the last 8 weeks
    # Use literal_column for the 'week' string to avoid PostgreSQL GROUP BY
    # matching failure when SQLAlchemy parameterizes the same literal multiple times.
    eight_weeks_ago = now - timedelta(weeks=8)
    _week_trunc = func.date_trunc(literal_column("'week'"), Candidate.created_at)
    weekly_result = await db.execute(
        select(
            _week_trunc.label("week_start"),
            func.count().label("new_candidates"),
        )
        .where(Candidate.created_at >= eight_weeks_ago)
        .group_by(_week_trunc)
        .order_by(_week_trunc)
    )
    weekly_trends = [
        WeeklyTrend(
            week_start=row.week_start.strftime("%Y-%m-%d"),
            new_candidates=row.new_candidates,
        )
        for row in weekly_result.all()
    ]

    return AnalyticsOverview(
        active_workers=active_workers,
        placement_rate=round(placement_rate, 4),
        pipeline_velocity=pipeline_velocity,
        revenue_forecast_monthly_pln=round(revenue_forecast_monthly_pln, 2),
        pipeline_by_stage=pipeline_by_stage,
        weekly_trends=weekly_trends,
        computed_at=now.isoformat(),
    )


@router.get("/recruiter", response_model=RecruiterAnalytics)
async def get_recruiter_analytics(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RecruiterAnalytics:
    now = datetime.now(UTC)

    # Active workers
    active_workers_result = await db.execute(
        select(func.count())
        .select_from(Worker)
        .where(Worker.attendance_status == AttendanceStatus.active)
    )
    active_workers: int = active_workers_result.scalar_one()

    # Placement rate
    total_result = await db.execute(select(func.count()).select_from(Candidate))
    total_candidates: int = total_result.scalar_one()
    hired_result = await db.execute(
        select(func.count())
        .select_from(Candidate)
        .where(Candidate.screening_status == ScreeningStatus.hired)
    )
    hired: int = hired_result.scalar_one()
    placement_rate = (hired / total_candidates) if total_candidates > 0 else 0.0

    # Fill rate: sum(headcount_filled) / sum(headcount_needed) across all job orders
    fill_totals_result = await db.execute(
        select(
            func.sum(JobOrder.headcount_filled).label("total_filled"),
            func.sum(JobOrder.headcount_needed).label("total_needed"),
        )
    )
    fill_row = fill_totals_result.one()
    total_filled = fill_row.total_filled or 0
    total_needed = fill_row.total_needed or 0
    fill_rate = float(total_filled) / float(total_needed) if total_needed > 0 else 0.0

    # Avg time-to-fill: avg days from created_at to updated_at for filled job orders
    avg_ttf_result = await db.execute(
        select(
            func.avg(
                func.extract(
                    "epoch",
                    JobOrder.updated_at - JobOrder.created_at,
                )
                / 86400.0
            ).label("avg_days")
        )
        .where(JobOrder.status == JobOrderStatus.filled)
    )
    avg_ttf_row = avg_ttf_result.scalar_one()
    avg_time_to_fill_days = round(float(avg_ttf_row), 1) if avg_ttf_row is not None else None

    # Placements by month: count of assignments started per month, last 6 months
    six_months_ago = now - timedelta(days=183)
    _month_fmt = func.to_char(Assignment.start_date, literal_column("'YYYY-MM'"))
    placements_result = await db.execute(
        select(
            _month_fmt.label("month"),
            func.count().label("cnt"),
        )
        .where(Assignment.start_date >= six_months_ago)
        .group_by(_month_fmt)
        .order_by(_month_fmt)
    )
    placements_by_month = [
        PlacementsByMonth(month=row.month, count=row.cnt)
        for row in placements_result.all()
    ]

    # Compliance summary: unacknowledged alerts expiring within 7/30/90 days
    day7 = now + timedelta(days=7)
    day30 = now + timedelta(days=30)
    day90 = now + timedelta(days=90)

    def _compliance_count_query(cutoff: datetime):
        return (
            select(func.count())
            .select_from(ComplianceAlert)
            .where(
                ComplianceAlert.acknowledged == False,  # noqa: E712
                ComplianceAlert.due_date <= cutoff,
                ComplianceAlert.due_date >= now,
            )
        )

    exp7_result = await db.execute(_compliance_count_query(day7))
    exp30_result = await db.execute(_compliance_count_query(day30))
    exp90_result = await db.execute(_compliance_count_query(day90))
    compliance_summary = ComplianceSummary(
        expiring_7d=exp7_result.scalar_one(),
        expiring_30d=exp30_result.scalar_one(),
        expiring_90d=exp90_result.scalar_one(),
    )

    # Weekly trend: candidate intake per week for the last 8 weeks
    eight_weeks_ago = now - timedelta(weeks=8)
    _week_trunc_r = func.date_trunc(literal_column("'week'"), Candidate.created_at)
    weekly_result = await db.execute(
        select(
            _week_trunc_r.label("week_start"),
            func.count().label("new_candidates"),
        )
        .where(Candidate.created_at >= eight_weeks_ago)
        .group_by(_week_trunc_r)
        .order_by(_week_trunc_r)
    )
    weekly_trends = [
        WeeklyTrend(
            week_start=row.week_start.strftime("%Y-%m-%d"),
            new_candidates=row.new_candidates,
        )
        for row in weekly_result.all()
    ]

    return RecruiterAnalytics(
        active_workers=active_workers,
        placement_rate=round(placement_rate, 4),
        fill_rate=round(fill_rate, 4),
        avg_time_to_fill_days=avg_time_to_fill_days,
        placements_by_month=placements_by_month,
        compliance_summary=compliance_summary,
        weekly_trends=weekly_trends,
        computed_at=now.isoformat(),
    )


@router.get("/b2b", response_model=B2BAnalytics)
async def get_b2b_analytics(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> B2BAnalytics:
    now = datetime.now(UTC)

    # Revenue forecast
    active_workers_result = await db.execute(
        select(func.count())
        .select_from(Worker)
        .where(Worker.attendance_status == AttendanceStatus.active)
    )
    active_workers: int = active_workers_result.scalar_one()

    avg_rate_result = await db.execute(
        select(func.avg(Assignment.employer_rate))
        .join(Worker, Assignment.worker_id == Worker.id)
        .where(
            Worker.attendance_status == AttendanceStatus.active,
            Assignment.is_active == True,  # noqa: E712
        )
    )
    avg_rate = avg_rate_result.scalar_one() or 0.0
    revenue_forecast_monthly_pln = float(active_workers) * float(avg_rate) * 22.0

    # Pipeline velocity
    week_ago = now - timedelta(days=7)
    velocity_result = await db.execute(
        select(func.count())
        .select_from(Candidate)
        .where(Candidate.created_at >= week_ago)
    )
    pipeline_velocity: int = velocity_result.scalar_one()

    # Pipeline value: sum of estimated_monthly_value for open prospects (not converted/lost)
    pipeline_value_result = await db.execute(
        select(func.coalesce(func.sum(Prospect.estimated_monthly_value), 0))
        .where(Prospect.status.notin_(["converted", "lost"]))
    )
    pipeline_value_pln = float(pipeline_value_result.scalar_one() or 0)

    # Conversion rate: converted / total prospects
    total_prospects_result = await db.execute(select(func.count()).select_from(Prospect))
    total_prospects: int = total_prospects_result.scalar_one()
    converted_result = await db.execute(
        select(func.count())
        .select_from(Prospect)
        .where(Prospect.status == "converted")
    )
    converted: int = converted_result.scalar_one()
    conversion_rate = (converted / total_prospects) if total_prospects > 0 else 0.0

    # Revenue per client: top 10 clients by monthly revenue (active assignments)
    revenue_by_client_result = await db.execute(
        select(
            Client.company_name,
            (func.sum(Assignment.employer_rate) * 22).label("revenue_monthly"),
        )
        .join(Assignment, Assignment.client_id == Client.id)
        .where(Assignment.is_active == True)  # noqa: E712
        .group_by(Client.id, Client.company_name)
        .order_by((func.sum(Assignment.employer_rate) * 22).desc())
        .limit(10)
    )
    revenue_per_client = [
        RevenuePerClient(
            client_name=row.company_name,
            revenue_monthly_pln=round(float(row.revenue_monthly), 2),
        )
        for row in revenue_by_client_result.all()
    ]

    # Pipeline by stage (candidate stages)
    stage_result = await db.execute(
        select(Candidate.screening_status, func.count().label("cnt"))
        .group_by(Candidate.screening_status)
        .order_by(func.count().label("cnt").desc())
    )
    pipeline_by_stage = [
        PipelineStageCount(status=row[0], count=row[1])
        for row in stage_result.all()
    ]

    # Prospects funnel: count by status
    funnel_result = await db.execute(
        select(Prospect.status, func.count().label("cnt"))
        .group_by(Prospect.status)
        .order_by(func.count().label("cnt").desc())
    )
    prospects_funnel = [
        ProspectFunnelCount(status=row[0], count=row[1])
        for row in funnel_result.all()
    ]

    return B2BAnalytics(
        revenue_forecast_monthly_pln=round(revenue_forecast_monthly_pln, 2),
        pipeline_velocity=pipeline_velocity,
        pipeline_value_pln=round(pipeline_value_pln, 2),
        conversion_rate=round(conversion_rate, 4),
        revenue_per_client=revenue_per_client,
        pipeline_by_stage=pipeline_by_stage,
        prospects_funnel=prospects_funnel,
        computed_at=now.isoformat(),
    )
