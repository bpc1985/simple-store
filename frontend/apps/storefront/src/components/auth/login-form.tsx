"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLogin } from "@/hooks/use-auth";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@simplestore/ui";
import { Input } from "@simplestore/ui";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginForm({ returnUrl = "/" }: { returnUrl?: string }) {
  const router = useRouter();
  const login = useLogin();
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    login.mutate(data, {
      onSuccess: (res) => {
        auth.login(res.accessToken, res.refreshToken);
        toast.success("Logged in successfully");
        router.push(returnUrl);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input type="email" {...register("email")} className="mt-1" />
        {errors.email && (
          <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium">Password</label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            {...register("password")}
            className="mt-1 pr-10"
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
        {errors.password && (
          <p className="text-xs text-destructive mt-1">
            {errors.password.message}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? "Logging in..." : "Login"}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/account/register" className="text-primary hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}
