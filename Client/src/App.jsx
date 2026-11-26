import { useEffect, useState } from "react";
import "./App.css";

// Relative URL: nginx (Docker) or the Vite dev proxy forwards /api to the backend
const API = import.meta.env.VITE_API_URL || "/api/applications";
const empty = { full_name: "", email: "", phone: "", position: "", experience: 0, cover_letter: "" };

export default function App() {
  const [form, setForm] = useState(empty);
  const [list, setList] = useState([]);
  const [editId, setEditId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [toast, setToast] = useState(null);

  const load = async () => setList(await (await fetch(API)).json());
  useEffect(() => { load(); }, []);

  const notify = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await fetch(editId ? `${API}/${editId}` : API, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      notify(editId ? "Application updated ✔" : "Application submitted ✔");
      setForm(empty);
      setEditId(null);
      load();
    } catch {
      notify("Something went wrong", "error");
    }
  };

  const edit = (a) => {
    setEditId(a.id);
    setForm(a);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id) => {
    if (!confirm("Delete this application?")) return;
    setRemovingId(id);
    setTimeout(async () => {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      setRemovingId(null);
      notify("Application deleted", "error");
      load();
    }, 350);
  };

  return (
    <div className="container">
      <h2 className="title">Job Application Form</h2>

      <form className="card" onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <input name="full_name" placeholder=" " value={form.full_name} onChange={change} required />
            <label>Full name</label>
          </div>
          <div className="field">
            <input name="email" type="email" placeholder=" " value={form.email} onChange={change} required />
            <label>Email</label>
          </div>
          <div className="field">
            <input name="phone" placeholder=" " value={form.phone || ""} onChange={change} />
            <label>Phone</label>
          </div>
          <div className="field">
            <input name="position" placeholder=" " value={form.position} onChange={change} required />
            <label>Position applying for</label>
          </div>
          <div className="field full">
            <input name="experience" type="number" min="0" placeholder=" " value={form.experience} onChange={change} />
            <label>Years of experience</label>
          </div>
          <div className="field full">
            <textarea name="cover_letter" placeholder=" " value={form.cover_letter || ""} onChange={change} />
            <label>Cover letter</label>
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: 20 }}>
          <button type="submit" className="btn-primary">{editId ? "Update" : "Submit"}</button>
          {editId && (
            <button type="button" className="btn-secondary" onClick={() => { setEditId(null); setForm(empty); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <h3>Applications ({list.length})</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Position</th><th>Exp</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.map((a, i) => (
                <tr
                  key={a.id}
                  className={removingId === a.id ? "removing" : ""}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <td>{a.full_name}</td>
                  <td>{a.email}</td>
                  <td>{a.position}</td>
                  <td><span className="badge">{a.experience} yrs</span></td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => edit(a)}>Edit</button>
                    <button className="btn-delete" onClick={() => remove(a.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="empty">No applications yet. Submit the first one!</p>}
        </div>
      </div>

      {toast && <div className={`toast ${toast.type === "error" ? "error" : ""}`}>{toast.msg}</div>}
    </div>
  );
}