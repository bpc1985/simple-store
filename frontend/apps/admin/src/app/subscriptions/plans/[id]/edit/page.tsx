"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@simplestore/ui";
import { Input } from "@simplestore/ui";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@simplestore/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@simplestore/ui";
import { usePlans, useUpdatePlan } from "@/hooks/use-subscriptions";
import { ArrowLeft, Loader2 } from "lucide-react";

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  cadence: z.enum(["MONTHLY", "QUARTERLY"]),
  imageUrl: z.string().optional(),
  active: z.boolean(),
});

type PlanForm = z.infer<typeof planSchema>;

export default function EditPlanPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const planId = Number(id);
  const { data: plans, isLoading } = usePlans();
  const updatePlan = useUpdatePlan();
  const plan = plans?.find((p) => p.id === planId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    values: plan
      ? {
          name: plan.name,
          description: plan.description ?? "",
          price: plan.price,
          cadence: plan.cadence,
          imageUrl: plan.imageUrl ?? "",
          active: plan.active,
        }
      : undefined,
  });

  const selectedCadence = watch("cadence");
  const isActive = watch("active");

  const onSubmit = async (data: PlanForm) => {
    updatePlan.mutate(
      {
        id: planId,
        name: data.name,
        description: data.description ?? "",
        price: data.price,
        cadence: data.cadence,
        imageUrl: data.imageUrl ?? "",
        active: data.active,
      },
      {
        onSuccess: () => router.push("/subscriptions/plans"),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="animate-fade-in mx-auto max-w-2xl">
        <Link
          href="/subscriptions/plans"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Plans
        </Link>
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Plan not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <Link
        href="/subscriptions/plans"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Plans
      </Link>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Edit Plan
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Update subscription plan #{planId}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium">
              Name
            </Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">
              Description
            </Label>
            <Input id="description" {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs font-medium">
                Price ($)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price")}
              />
              {errors.price && (
                <p className="text-xs text-destructive">{errors.price.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cadence" className="text-xs font-medium">
                Cadence
              </Label>
              <Select
                value={selectedCadence}
                onValueChange={(v) => {
                  if (v) setValue("cadence", v as "MONTHLY" | "QUARTERLY", { shouldValidate: true });
                }}
              >
                <SelectTrigger>
                  {selectedCadence === "MONTHLY" ? "Monthly" : "Quarterly"}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imageUrl" className="text-xs font-medium">
              Image URL
            </Label>
            <Input id="imageUrl" {...register("imageUrl")} />
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) =>
                  setValue("active", e.target.checked)
                }
                className="size-4 rounded border-border accent-primary"
              />
              <span className="text-sm font-medium">Active</span>
            </label>
            <span className="text-xs text-muted-foreground">
              {isActive
                ? "Visible to customers"
                : "Hidden from customers"}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || updatePlan.isPending}
            >
              {updatePlan.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
