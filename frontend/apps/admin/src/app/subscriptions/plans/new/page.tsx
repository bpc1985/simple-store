"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useCreatePlan } from "@/hooks/use-subscriptions";
import { ArrowLeft, Loader2 } from "lucide-react";

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  cadence: z.enum(["MONTHLY", "QUARTERLY"]),
  imageUrl: z.string().optional(),
});

type PlanForm = z.infer<typeof planSchema>;

export default function NewPlanPage() {
  const router = useRouter();
  const createPlan = useCreatePlan();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { cadence: "MONTHLY" },
  });

  const selectedCadence = watch("cadence");

  const onSubmit = async (data: PlanForm) => {
    createPlan.mutate(
      {
        name: data.name,
        description: data.description ?? "",
        price: data.price,
        cadence: data.cadence,
        imageUrl: data.imageUrl ?? "",
      },
      {
        onSuccess: () => router.push("/subscriptions/plans"),
      }
    );
  };

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
            New Subscription Plan
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create a subscription plan for customers
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium">
              Name
            </Label>
            <Input id="name" placeholder='e.g. "Monthly Coffee Box"' {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">
              Description
            </Label>
            <Input
              id="description"
              placeholder="What subscribers get each cycle"
              {...register("description")}
            />
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
                placeholder="29.99"
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
              {errors.cadence && (
                <p className="text-xs text-destructive">{errors.cadence.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imageUrl" className="text-xs font-medium">
              Image URL
            </Label>
            <Input
              id="imageUrl"
              placeholder="https://..."
              {...register("imageUrl")}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || createPlan.isPending}
            >
              {createPlan.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Plan"
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
