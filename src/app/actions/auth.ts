"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
    const username = formData.get("username");
    const password = formData.get("password");

    const validUser = process.env.AUTH_USER;
    const validPass = process.env.AUTH_PASS;

    if (username === validUser && password === validPass) {
        // Set a simple session cookie
        (await cookies()).set("session", "authenticated", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/",
        });
        return { success: true };
    } else {
        return { error: "Invalid credentials" };
    }
}

export async function logout() {
    (await cookies()).delete("session");
    redirect("/login");
}
