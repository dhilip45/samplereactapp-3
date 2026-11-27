import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

// Relative URL: nginx (Docker) or the Vite dev proxy forwards /api to the backend
const API = import.meta.env.VITE_API_URL || "/api/applications";
const empty = { full_name: "", email: "", phone: "", position: "", experience: 0, cover_letter: "" };

async function requestJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export default function App() {
  const [form, setForm] = useState(empty);
  const [list, setList] = useState([]);
  const [editId, setEditId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const notify = useCallback((msg, type = "ok") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await requestJson(API);
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      notify(err.message || "Failed to load applications", "error");
    }
  }, [notify]);

  useEffect(() => {
    let active = true;
    requestJson(API)
      .then((data) => {
        if (active) setList(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) notify(err.message || "Failed to load applications", "error");
      });
    return () => {
      active = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [notify]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        position: form.position,
        experience: form.experience === "" ? 0 : Number(form.experience),
        cover_letter: form.cover_letter,
      };
      await requestJson(editId ? `${API}/${editId}` : API, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      notify(editId ? "Application updated ✔" : "Application submitted ✔");
      setForm(empty);
      setEditId(null);
      await load();
    } catch (err) {
      notify(err.message || "Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const edit = (a) => {
    setEditId(a.id);
    setForm({
      full_name: a.full_name || "",
      email: a.email || "",
      phone: a.phone || "",
      position: a.position || "",
      experience: a.experience ?? 0,
      cover_letter: a.cover_letter || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = (id) => {
    if (!confirm("Delete this application?")) return;
    setRemovingId(id);
    setTimeout(async () => {
      try {
        await requestJson(`${API}/${id}`, { method: "DELETE" });
        if (editId === id) {
          setEditId(null);
          setForm(empty);
        }
        notify("Application deleted", "error");
        await load();
      } catch (err) {
        notify(err.message || "Failed to delete application", "error");
      } finally {
        setRemovingId(null);
      }
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
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Saving..." : editId ? "Update" : "Submit"}
          </button>
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
