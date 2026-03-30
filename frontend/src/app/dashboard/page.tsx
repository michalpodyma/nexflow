"use client";

import { useEffect, useState } from "react";

import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCandidates, getClients, getWorkers } from "@/lib/api";

interface Stats {
  candidates: number;
  workers: number;
  clients: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ candidates: 0, workers: 0, clients: 0 });

  useEffect(() => {
    async function load() {
      const [c, w, cl] = await Promise.allSettled([
        getCandidates(1, 1),
        getWorkers(1, 1),
        getClients(1, 1),
      ]);
      setStats({
        candidates: c.status === "fulfilled" ? c.value.total : 0,
        workers: w.status === "fulfilled" ? w.value.total : 0,
        clients: cl.status === "fulfilled" ? cl.value.total : 0,
      });
    }
    load();
  }, []);

  const statCards = [
    { title: "Total Candidates", value: stats.candidates },
    { title: "Active Workers", value: stats.workers },
    { title: "Clients", value: stats.clients },
    { title: "Scheduled (soon)", value: "—" },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <Header title="Dashboard" />
      <main className="flex-1 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
