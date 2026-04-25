import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  addGroupMember,
  createGroup,
  createUser,
  deleteGroupMember,
  getGroupMembers,
  getUserGroups,
  updateUser
} from "../services/api";

const educationLevels = [
  { value: "elementary", label: "Elementary" },
  { value: "junior_high", label: "Junior High" },
  { value: "senior_high", label: "Senior High" },
  { value: "college", label: "College" },
  { value: "all_levels", label: "All Levels" }
];

const alertIntensities = [
  { value: "chill", label: "Chill" },
  { value: "normal", label: "Normal" },
  { value: "panic", label: "Panic" }
];

const panicPersonalities = [
  { value: "calm_classmate", label: "Calm Classmate" },
  { value: "oa_barkada", label: "OA Barkada" },
  { value: "strict_registrar", label: "Strict Registrar" },
  { value: "tita_mode", label: "Tita Mode" }
];

const defaultProfile = {
  full_name: "",
  email: "",
  school_name: "",
  city: "",
  education_level: "college",
  section_or_group: "",
  alert_intensity: "normal",
  panic_personality: "oa_barkada"
};

export default function ProfileSetupPage({ user, onUserUpdated }) {
  const [profile, setProfile] = useState(defaultProfile);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [groupName, setGroupName] = useState("My Barkada Alert Circle");
  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    role: "member",
    is_opted_in: true
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    setProfile(user || defaultProfile);
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setGroup(null);
      setMembers([]);
      return;
    }

    async function loadGroups() {
      const groups = await getUserGroups(user.id);
      const primary = groups[0] || null;
      setGroup(primary);

      if (primary) {
        const data = await getGroupMembers(primary.id);
        setMembers(data);
      } else {
        setMembers([]);
      }
    }

    loadGroups();
  }, [user?.id]);

  async function handleSaveProfile(event) {
    event.preventDefault();
    setStatus("Saving profile...");

    try {
      const saved = user?.id
        ? await updateUser(user.id, profile)
        : await createUser(profile);
      onUserUpdated(saved);
      setStatus("Profile saved.");
    } catch (error) {
      console.error(error);
      setStatus(error.response?.data?.message || error.message || "Could not save profile.");
    }
  }

  async function handleCreateGroup() {
    if (!user?.id) {
      setStatus("Save the profile first before creating the group.");
      return;
    }

    const created = await createGroup({
      owner_user_id: user.id,
      group_name: groupName
    });
    setGroup(created);
    setMembers([]);
    setStatus("Group created.");
  }

  async function handleAddMember(event) {
    event.preventDefault();
    if (!group?.id) {
      setStatus("Create the group first before adding emails.");
      return;
    }

    await addGroupMember(group.id, memberForm);
    const data = await getGroupMembers(group.id);
    setMembers(data);
    setMemberForm({
      name: "",
      email: "",
      role: "member",
      is_opted_in: true
    });
    setStatus("Member added.");
  }

  async function handleDeleteMember(memberId) {
    if (!group?.id) return;
    await deleteGroupMember(group.id, memberId);
    const data = await getGroupMembers(group.id);
    setMembers(data);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSaveProfile}
          className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Setup profile</p>
          <h1 className="mt-4 font-display text-5xl leading-none text-stone-900">
            Create the student profile first.
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            This is the first required button flow. Fill this in first so the AI knows who the announcement applies to.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["full_name", "Full name"],
              ["email", "Email"],
              ["school_name", "School name"],
              ["city", "City"],
              ["section_or_group", "Section or group"]
            ].map(([key, label]) => (
              <label key={key} className="text-sm text-stone-700">
                <span className="mb-2 block font-semibold">{label}</span>
                <input
                  value={profile[key] || ""}
                  onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
                />
              </label>
            ))}

            <label className="text-sm text-stone-700">
              <span className="mb-2 block font-semibold">Education level</span>
              <select
                value={profile.education_level || "college"}
                onChange={(event) => setProfile((current) => ({ ...current, education_level: event.target.value }))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
              >
                {educationLevels.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-stone-700">
              <span className="mb-2 block font-semibold">Alert intensity</span>
              <select
                value={profile.alert_intensity || "normal"}
                onChange={(event) => setProfile((current) => ({ ...current, alert_intensity: event.target.value }))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
              >
                {alertIntensities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-stone-700 md:col-span-2">
              <span className="mb-2 block font-semibold">Panic personality</span>
              <select
                value={profile.panic_personality || "oa_barkada"}
                onChange={(event) => setProfile((current) => ({ ...current, panic_personality: event.target.value }))}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
              >
                {panicPersonalities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="mt-8 rounded-xl bg-stone-900 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-white">
            Save Profile
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card"
        >
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-stone-500">Setup group and emails</p>
          <h2 className="mt-4 font-display text-5xl leading-none text-stone-900">
            Create the barkada group and add email recipients.
          </h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            This is the second half of the setup button. Add only people who agreed to receive alerts.
          </p>

          {!group ? (
            <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <label className="text-sm text-stone-700">
                <span className="mb-2 block font-semibold">Group name</span>
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
                />
              </label>
              <button
                onClick={handleCreateGroup}
                className="mt-4 rounded-xl bg-lime-300 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-stone-900"
              >
                Create Group
              </button>
            </div>
          ) : (
            <>
              <div className="mt-8 rounded-2xl border border-lime-300 bg-lime-100 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-600">Current group</p>
                <p className="mt-2 text-xl font-semibold text-stone-900">{group.group_name}</p>
                <p className="mt-1 text-sm text-stone-600">Invite code: {group.invite_code}</p>
              </div>

              <form onSubmit={handleAddMember} className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]">
                <input
                  placeholder="Name"
                  value={memberForm.name}
                  onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
                />
                <input
                  placeholder="Email"
                  value={memberForm.email}
                  onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
                />
                <select
                  value={String(memberForm.is_opted_in)}
                  onChange={(event) => setMemberForm((current) => ({ ...current, is_opted_in: event.target.value === "true" }))}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 outline-none focus:border-lime-300"
                >
                  <option value="true">Opted in</option>
                  <option value="false">Pending</option>
                </select>
                <button className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white">
                  Add
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-stone-900">{member.name}</p>
                      <p className="text-sm text-stone-500">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-stone-700">
                        {member.is_opted_in ? "opted in" : "pending"}
                      </span>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-stone-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {status ? <p className="mt-6 text-sm font-semibold text-stone-700">{status}</p> : null}
        </motion.div>
      </div>
    </div>
  );
}
