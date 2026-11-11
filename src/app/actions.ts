"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { destroySession, hashToken, newToken, requireSession } from "@/lib/auth";
import { checkAll, checkProject } from "@/lib/health";
import * as q from "@/lib/queries";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const cleanUrl = (v: string) => (/^https?:\/\/[^\s]+$/i.test(v) ? v : "");

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/* ---------- Clients ---------- */
export async function createClientAction(fd: FormData) {
  await requireSession();
  const name = text(fd, "name");
  if (!name) return;
  const id = await q.createClient({ name, contact: text(fd, "contact"), notes: text(fd, "notes") });
  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}

export async function updateClientAction(id: string, fd: FormData) {
  await requireSession();
  const name = text(fd, "name");
  if (!name) return;
  await q.updateClient(id, { name, contact: text(fd, "contact"), notes: text(fd, "notes") });
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
}

export async function deleteClientAction(id: string) {
  await requireSession();
  await q.deleteClient(id);
  revalidatePath("/", "layout");
  redirect("/clients");
}

/* ---------- Projects ---------- */
export async function createProjectAction(fd: FormData) {
  await requireSession();
  const name = text(fd, "name");
  if (!name) return;
  const id = await q.createProject({
    name,
    clientId: text(fd, "clientId") || null,
    kind: text(fd, "kind"),
    healthUrl: cleanUrl(text(fd, "healthUrl")),
    notes: text(fd, "notes"),
    allowedDomain: text(fd, "allowedDomain"),
    policy: text(fd, "policy"),
  });
  const project = await q.getProject(id);
  if (project?.health_url) await checkProject(project);
  revalidatePath("/", "layout");
  redirect(`/projects/${id}`);
}

export async function updateProjectAction(id: string, fd: FormData) {
  await requireSession();
  const name = text(fd, "name");
  if (!name) return;
  await q.updateProject(id, {
    name,
    clientId: text(fd, "clientId") || null,
    kind: text(fd, "kind"),
    healthUrl: cleanUrl(text(fd, "healthUrl")),
    notes: text(fd, "notes"),
  });
  revalidatePath("/", "layout");
}

export async function deleteProjectAction(id: string) {
  await requireSession();
  await q.deleteProject(id);
  revalidatePath("/", "layout");
  redirect("/projects");
}

export async function checkProjectAction(id: string) {
  await requireSession();
  const p = await q.getProject(id);
  if (p) await checkProject(p);
  revalidatePath("/", "layout");
}

export async function checkAllAction() {
  await requireSession();
  await checkAll();
  revalidatePath("/", "layout");
}

/* ---------- Licence and running copies ---------- */
export async function licenseOpAction(projectId: string, op: "suspend" | "reactivate" | "rotate") {
  await requireSession();
  if (op === "rotate") await q.rotateKey(projectId);
  else await q.updateLicense(projectId, { status: op === "suspend" ? "suspended" : "active" });
  revalidatePath("/", "layout");
}

export async function licenseSettingsAction(projectId: string, fd: FormData) {
  await requireSession();
  const policy = text(fd, "policy") === "block" ? "block" : "warn";
  await q.updateLicense(projectId, { policy, allowed_domain: text(fd, "allowedDomain") });
  revalidatePath(`/projects/${projectId}`);
}

export async function instanceOpAction(instanceId: string, op: "block" | "allow" | "remove") {
  await requireSession();
  if (op === "remove") await q.removeInstance(instanceId);
  else await q.setInstanceStatus(instanceId, op === "block" ? "blocked" : "allowed");
  revalidatePath("/", "layout");
}

export async function resolveEventAction(eventId: string) {
  await requireSession();
  await q.resolveEvent(eventId);
  revalidatePath("/", "layout");
}

/* ---------- API tokens ---------- */
export async function createTokenAction(_prev: { error?: string; token?: string }, fd: FormData) {
  await requireSession();
  const name = text(fd, "name");
  if (!name) return { error: "Give the token a name so you can recognise it later." };
  const token = newToken();
  await q.createTokenRow(name, hashToken(token), `${token.slice(0, 7)}…`);
  revalidatePath("/settings");
  return { token };
}

export async function revokeTokenAction(id: string) {
  await requireSession();
  await q.revokeToken(id);
  revalidatePath("/settings");
}
