"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRegister } from "@/hooks/use-auth";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@simplestore/ui";
import { Input } from "@simplestore/ui";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const schema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterForm() {
  const router = useRouter();
  const registerMutation = useRegister();
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    registerMutation.mutate(
      {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      },
      {
        onSuccess: (res) => {
          auth.login(res.accessToken, res.refreshToken);
          toast.success("Account created successfully");
          router.push("/");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
        <Input id="fullName" {...register("fullName")} className="mt-1 h-11" />
        {errors.fullName && (
          <p className="text-xs text-destructive mt-1">
            {errors.fullName.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input id="email" type="email" {...register("email")} className="mt-1 h-11" />
        {errors.email && (
          <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            {...register("password", {
              onChange: (e) => setPasswordValue(e.target.value),
            })}
            className="mt-1 pr-10 h-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {passwordValue && <PasswordStrength value={passwordValue} />}
        {errors.password && (
          <p className="text-xs text-destructive mt-1">
            {errors.password.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
        <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          {...register("confirmPassword")}
          className="mt-1 h-11"
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive mt-1">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? "Creating account..." : "Register"}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <Link href="/account/login" className="text-primary hover:underline">
          Login
        </Link>
      </p>
    </form>
  );
}

function PasswordStrength({ value }: { value: string }) {
  let strength = 0;
  if (value.length >= 8) strength++;
  if (/[A-Z]/.test(value)) strength++;
  if (/[0-9]/.test(value)) strength++;
  if (/[^A-Za-z0-9]/.test(value)) strength++;

  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-destructive",
    "bg-amber-500",
    "bg-amber-400",
    "bg-success",
  ];

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < strength ? colors[strength - 1] : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs", strength > 0 ? "text-foreground" : "text-muted-foreground")}>
        {strength > 0 ? labels[strength - 1] : "Minimum 6 characters"}
      </p>
    </div>
  );
}
