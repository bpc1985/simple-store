"use client";

import { useState } from "react";
import { useUsers, useLockUser, useUnlockUser } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Lock, Unlock, Users } from "lucide-react";

export default function UsersPage() {
  const [page, setPage] = useState(0);
  const [actionUser, setActionUser] = useState<{
    id: string;
    locked: boolean;
  } | null>(null);
  const { data, isLoading } = useUsers(page);
  const lockUser = useLockUser();
  const unlockUser = useUnlockUser();
  const totalPages = data
    ? Math.ceil(data.totalCount / (data.pageSize || 10))
    : 0;

  return (
    <div className="animate-fade-in max-w-7xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Users
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {data ? `${data.totalCount} users` : "Loading..."}
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No users found
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {u.id}
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.fullName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.roles?.join(", ")}
                  </TableCell>
                  <TableCell>
                    {u.locked ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        <Lock className="size-3" />
                        Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActionUser({ id: u.id, locked: u.locked })}
                    >
                      {u.locked ? (
                        <><Unlock className="size-3.5" /> Unlock</>
                      ) : (
                        <><Lock className="size-3.5" /> Lock</>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog
        open={actionUser !== null}
        onOpenChange={() => setActionUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionUser?.locked ? "Unlock User" : "Lock User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionUser?.locked
                ? "This will restore the user's ability to sign in."
                : "The user will be unable to sign in until unlocked."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={actionUser?.locked ? "default" : "destructive"}
              onClick={() => {
                if (actionUser) {
                  if (actionUser.locked) unlockUser.mutate(actionUser.id);
                  else lockUser.mutate(actionUser.id);
                }
                setActionUser(null);
              }}
            >
              {actionUser?.locked ? "Unlock" : "Lock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
