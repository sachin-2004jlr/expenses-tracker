"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/shared/user-avatar";
import { changePasswordAction, signOutAction, updateProfileAction, type AuthFormState } from "@/features/auth/actions";
import { FieldError, FormAlert } from "@/features/auth/login-form";
import type { CurrentUser } from "@/lib/auth";

function SaveButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

function useSuccessToast(state: AuthFormState, refresh?: () => void) {
  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      refresh?.();
    }
  }, [state, refresh]);
}

export function AccountSettings({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [profileState, profileAction] = useActionState<AuthFormState, FormData>(updateProfileAction, {});
  const [passwordState, passwordAction] = useActionState<AuthFormState, FormData>(changePasswordAction, {});
  useSuccessToast(profileState, () => router.refresh());
  useSuccessToast(passwordState);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear in the app. Your e-mail is your sign-in and cannot be changed here.</CardDescription>
        </CardHeader>
        <form action={profileAction} key={profileState.success ? profileState.values?.name : undefined}>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar name={profileState.values?.name ?? user.name} email={user.email} image={user.image} size="lg" />
              <div className="text-sm">
                <p className="font-medium">{profileState.values?.name ?? user.name ?? "—"}</p>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <FormAlert message={profileState.error} />
            <div className="grid gap-1.5 sm:max-w-sm">
              <Label htmlFor="acct-name">Name</Label>
              <Input id="acct-name" name="name" defaultValue={profileState.values?.name ?? user.name ?? ""} maxLength={80} aria-invalid={Boolean(profileState.fieldErrors?.name)} />
              <FieldError id="acct-name-error" message={profileState.fieldErrors?.name} />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <SaveButton label="Save profile" pendingLabel="Saving…" />
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Passwords are hashed with scrypt and never stored in plain text.</CardDescription>
        </CardHeader>
        <form action={passwordAction} key={passwordState.success ? "reset" : "form"}>
          <CardContent className="grid gap-4 sm:max-w-md">
            <FormAlert message={passwordState.error} />
            <div className="grid gap-1.5">
              <Label htmlFor="acct-current">Current password</Label>
              <Input id="acct-current" name="currentPassword" type="password" autoComplete="current-password" required aria-invalid={Boolean(passwordState.fieldErrors?.currentPassword)} />
              <FieldError id="acct-current-error" message={passwordState.fieldErrors?.currentPassword} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="acct-new">New password</Label>
                <Input id="acct-new" name="newPassword" type="password" autoComplete="new-password" required minLength={8} aria-invalid={Boolean(passwordState.fieldErrors?.newPassword)} />
                <FieldError id="acct-new-error" message={passwordState.fieldErrors?.newPassword} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="acct-confirm">Confirm</Label>
                <Input id="acct-confirm" name="confirmPassword" type="password" autoComplete="new-password" required aria-invalid={Boolean(passwordState.fieldErrors?.confirmPassword)} />
                <FieldError id="acct-confirm-error" message={passwordState.fieldErrors?.confirmPassword} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <SaveButton label="Update password" pendingLabel="Updating…" />
          </CardFooter>
        </form>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Signed in on this device. Sessions expire after 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => void signOutAction()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
