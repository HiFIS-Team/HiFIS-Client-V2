"use client";

import { useAuth } from "@/providers/auth";
import { TaskTabs } from "@/components/tasks/task-tabs";
import { AdminTasks } from "@/components/tasks/admin-tasks";

export default function TasksPage() {
  const { user } = useAuth();

  // 어드민(대표)은 업무를 수행하지 않음 → 수행 UI 대신 감독/열람 뷰
  if (user?.role === "ADMIN") return <AdminTasks />;
  return <TaskTabs />;
}
