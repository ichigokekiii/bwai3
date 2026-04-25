import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  addGroupMember,
  createGroup,
  deleteGroupMember,
  getGroupMembers,
  getUserGroups
} from "../services/api";

export default function BarkadaCirclePage({ user }) {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [groupName, setGroupName] = useState("3ITE Alert Circle");
  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    role: "member",
    is_opted_in: true
  });

  async function load() {
    const groups = await getUserGroups(user.id);
    const primaryGroup = groups[0] || null;
    setGroup(primaryGroup);

    if (primaryGroup) {
      const memberData = await getGroupMembers(primaryGroup.id);
      setMembers(memberData);
    } else {
      setMembers([]);
    }
  }

  useEffect(() => {
    if (user?.id) {
      load();
    }
  }, [user?.id]);

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-stone-600 md:px-6">
        Loading barkada circle controls...
      </div>
    );
  }

  async function handleCreateGroup() {
    await createGroup({
      owner_user_id: user.id,
      group_name: groupName
    });
    await load();
  }

  async function handleAddMember(event) {
    event.preventDefault();
    if (!group) return;
    await addGroupMember(group.id, memberForm);
    setMemberForm({
      name: "",
      email: "",
      role: "member",
      is_opted_in: true
    });
    await load();
  }

  async function handleDelete(memberId) {
    await deleteGroupMember(group.id, memberId);
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2.5rem] border border-white/80 bg-white/88 p-6 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">Barkada Alert Circle</p>
          <h1 className="mt-3 font-display text-6xl leading-[0.95] text-stone-900">Trusted contacts, clear consent, simple management.</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            This screen is intentionally easy to read: one area for the circle itself, one area for the member list, and clear language about consent and opt-in.
          </p>

          {group ? (
            <div className="mt-8 rounded-[2rem] border border-lime-300 bg-lime-200/80 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-700">Active circle</p>
              <p className="mt-2 font-display text-4xl text-stone-900">{group.group_name}</p>
              <p className="mt-2 text-sm text-stone-700">Invite code: {group.invite_code}</p>
              <p className="mt-3 text-sm leading-7 text-stone-700">
                Legend: only members marked as `opted in` are eligible for automated barkada alert delivery.
              </p>
            </div>
          ) : (
            <div className="mt-8 rounded-[2rem] border border-stone-200 bg-stone-50/90 p-6">
              <p className="text-sm font-semibold text-stone-800">Create your first circle</p>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                Start with one trusted group for your class, block, or barkada.
              </p>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                className="mt-4 w-full rounded-[1.4rem] border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-lime-300"
              />
              <button
                onClick={handleCreateGroup}
                className="mt-4 rounded-full bg-stone-900 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white"
              >
                Create Group
              </button>
            </div>
          )}
        </div>

        <div className="rounded-[2.5rem] border border-white/80 bg-white/88 p-6 shadow-card">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Members</p>
              <h2 className="mt-2 font-display text-4xl text-stone-900">Consent-first contact list</h2>
            </div>
            <p className="text-sm text-stone-500">{members.length} contact(s) tracked</p>
          </div>

          {group ? (
            <>
              <form onSubmit={handleAddMember} className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]">
                <input
                  placeholder="Member name"
                  value={memberForm.name}
                  onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))}
                  className="rounded-[1.4rem] border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition focus:border-lime-300"
                />
                <input
                  placeholder="Member email"
                  value={memberForm.email}
                  onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                  className="rounded-[1.4rem] border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition focus:border-lime-300"
                />
                <select
                  value={String(memberForm.is_opted_in)}
                  onChange={(event) => setMemberForm((current) => ({ ...current, is_opted_in: event.target.value === "true" }))}
                  className="rounded-[1.4rem] border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none transition focus:border-lime-300"
                >
                  <option value="true">Opted in</option>
                  <option value="false">Pending</option>
                </select>
                <button className="rounded-full bg-lime-300 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-stone-900">
                  Add
                </button>
              </form>

              <p className="mt-4 text-sm leading-7 text-stone-600">
                Primary rule: add only people who agreed to receive alerts. This keeps the MVP safe and presentation-friendly.
              </p>

              <div className="mt-5 space-y-3">
                {members.map((member) => (
                  <motion.div
                    key={member.id}
                    layout
                    className="flex flex-col gap-3 rounded-[1.8rem] border border-stone-200 bg-stone-50/90 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-stone-900">{member.name}</p>
                      <p className="text-sm text-stone-500">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-700">
                        {member.is_opted_in ? "opted in" : "pending"}
                      </span>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-800"
                      >
                        Remove
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-5 text-stone-500">Create a group first so your barkada has somewhere to receive alerts responsibly.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
