"use client";

import { changeRoleAction } from "./role-actions";

export function RoleSwitcher({
  role,
}: {
  role: "buyer" | "owner" | "agency";
}) {
  return (
    <form action={changeRoleAction} className="mt-4 lg:mt-5">
      <span className="mb-2 block px-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
        Tryb wydania
      </span>
      <select
        name="role"
        defaultValue={role}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="spatial-input w-full"
        aria-label="Przełącznik role"
      >
        <option value="buyer">Kupujący</option>
        <option value="owner">Właściciel</option>
        <option value="agency">Agencja</option>
      </select>
      {role === "agency" && (
        <span className="mt-2 block rounded-lg border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-violet-200">
          Agencja Marka Własna
        </span>
      )}
    </form>
  );
}
