from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.middleware import CurrentUser
from app.database import get_db
from app.models.assignments import Assignment
from app.models.candidates import Candidate
from app.models.enums import AttendanceStatus, ScreeningStatus
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


@router.get("/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AnalyticsOverview:
    now = datetime.now(timezone.utc)

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
            Assignment.is_active == True,
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
    eight_weeks_ago = now - timedelta(weeks=8)
    weekly_result = await db.execute(
        select(
            func.date_trunc("week", Candidate.created_at).label("week_start"),
            func.count().label("new_candidates"),
        )
        .where(Candidate.created_at >= eight_weeks_ago)
        .group_by(func.date_trunc("week", Candidate.created_at))
        .order_by(func.date_trunc("week", Candidate.created_at))
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
