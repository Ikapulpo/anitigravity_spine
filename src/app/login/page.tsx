"use client";

import { login } from "@/app/actions/auth";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="flex w-full justify-center rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
        >
            {pending ? "サインイン中..." : "サインイン"}
        </button>
    );
}

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        const result = await login(formData);
        if (result?.error) {
            setError(result.error);
        } else if (result?.success) {
            router.push("/");
            router.refresh(); // Refresh to update middleware/server components
        }
    }

    const inputClass =
        "block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500";

    return (
        <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h1 className="text-center text-2xl font-bold tracking-tight text-slate-100">
                    脊椎OVFダッシュボード
                </h1>
                <p className="mt-2 text-center text-sm text-slate-500">
                    サインインしてください
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-8 sm:px-10">
                    <form action={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                                {error}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-slate-400"
                            >
                                ID
                            </label>
                            <div className="mt-1">
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-slate-400"
                            >
                                パスワード
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <SubmitButton />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
