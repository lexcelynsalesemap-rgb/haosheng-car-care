import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

function Users() {
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [shopId, setShopId] = useState("");

  const loggedInUser = JSON.parse(
    localStorage.getItem("user")
  );

  // -----------------------------------
  // LOAD USERS
  // -----------------------------------

  async function loadUsers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role, shop_id")
      .order("id", { ascending: true });

    if (error) {
      console.error("LOAD USERS ERROR:", error);
      alert(error.message);
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  }

  // -----------------------------------
  // LOAD SHOPS
  // -----------------------------------

  async function loadShops() {
    const { data, error } = await supabase
      .from("shops")
      .select("id, name")
      .order("id", { ascending: true });

    if (error) {
      console.error("LOAD SHOPS ERROR:", error);
      alert(error.message);
      return;
    }

    setShops(data || []);
  }

  useEffect(() => {
    loadUsers();
    loadShops();
  }, []);

  // -----------------------------------
  // CREATE USER
  // -----------------------------------

  async function createUser() {
    if (saving) return;

    if (!name.trim()) {
      alert("Please enter the user's name.");
      return;
    }

    if (!email.trim()) {
      alert("Please enter the user's email.");
      return;
    }

    if (!password) {
      alert("Please enter a password.");
      return;
    }

    if (!shopId) {
      alert("Please select a shop.");
      return;
    }

    setSaving(true);

    try {
      // Check if email already exists
      const { data: existingUser, error: checkError } =
        await supabase
          .from("users")
          .select("id")
          .eq("email", email.trim())
          .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingUser) {
        alert("A user with this email already exists.");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("users")
        .insert({
          name: name.trim(),
          email: email.trim(),
          password: password,
          role: role,
          shop_id: Number(shopId)
        });

      if (error) {
        throw error;
      }

      alert("User created successfully.");

      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setRole("staff");
      setShopId("");

      await loadUsers();

    } catch (error) {
      console.error("CREATE USER ERROR:", error);

      alert(
        error.message ||
        "Could not create user."
      );
    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------
  // DELETE USER
  // -----------------------------------

  async function deleteUser(userId) {
    if (userId === loggedInUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (error) {
      console.error("DELETE USER ERROR:", error);
      alert(error.message);
      return;
    }

    alert("User deleted.");

    await loadUsers();
  }

  // -----------------------------------
  // CHECK ADMIN
  // -----------------------------------

  if (loggedInUser?.role !== "admin") {
    return (
      <div style={styles.page}>
        <div style={styles.denied}>
          <h2>Access Denied</h2>

          <p>
            Only administrators can manage users.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------
  // PAGE
  // -----------------------------------

  return (
    <div style={styles.page}>

      <div style={styles.container}>

        <h1 style={styles.title}>
          User Management
        </h1>

        <p style={styles.subtitle}>
          Create users and assign their role and shop.
        </p>

        {/* CREATE USER */}

        <div style={styles.card}>

          <h2 style={styles.sectionTitle}>
            Add User
          </h2>

          <label style={styles.label}>
            Name
          </label>

          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="User name"
            style={styles.input}
          />

          <label style={styles.label}>
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="user@example.com"
            style={styles.input}
          />

          <label style={styles.label}>
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Password"
            style={styles.input}
          />

          <label style={styles.label}>
            Role
          </label>

          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value)
            }
            style={styles.input}
          >
            <option value="staff">
              Staff
            </option>

            <option value="inventory_staff">
              Inventory Staff
            </option>

            <option value="manager">
              Manager
            </option>

            <option value="admin">
              Admin
            </option>
          </select>

          <label style={styles.label}>
            Shop
          </label>

          <select
            value={shopId}
            onChange={(e) =>
              setShopId(e.target.value)
            }
            style={styles.input}
          >
            <option value="">
              Select Shop
            </option>

            {shops.map((shop) => (
              <option
                key={shop.id}
                value={shop.id}
              >
                {shop.name || `Shop ${shop.id}`}
              </option>
            ))}
          </select>

          <button
            onClick={createUser}
            disabled={saving}
            style={{
              ...styles.button,
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving
              ? "CREATING..."
              : "CREATE USER"}
          </button>

        </div>

        {/* USERS */}

        <div style={styles.card}>

          <h2 style={styles.sectionTitle}>
            Existing Users
          </h2>

          {loading ? (

            <p>Loading users...</p>

          ) : users.length === 0 ? (

            <p style={styles.empty}>
              No users found.
            </p>

          ) : (

            <div style={styles.userList}>

              {users.map((user) => (

                <div
                  key={user.id}
                  style={styles.userRow}
                >

                  <div>

                    <div style={styles.userName}>
                      {user.name}
                    </div>

                    <div style={styles.email}>
                      {user.email}
                    </div>

                    <div style={styles.details}>
                      Role:{" "}
                      <strong>
                        {user.role}
                      </strong>
                      {" • "}
                      Shop:{" "}
                      <strong>
                        {user.shop_id}
                      </strong>
                    </div>

                  </div>

                  {user.id !== loggedInUser?.id && (

                    <button
                      onClick={() =>
                        deleteUser(user.id)
                      }
                      style={styles.deleteButton}
                    >
                      Delete
                    </button>

                  )}

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b0b0b",
    color: "#fff",
    padding: "30px"
  },

  container: {
    maxWidth: "750px",
    margin: "0 auto"
  },

  title: {
    color: "#d4af37",
    fontSize: "30px",
    marginBottom: "5px"
  },

  subtitle: {
    color: "#999",
    marginBottom: "25px"
  },

  card: {
    background: "#151515",
    border: "1px solid #3b321c",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px"
  },

  sectionTitle: {
    color: "#d4af37",
    marginTop: 0
  },

  label: {
    display: "block",
    marginTop: "12px",
    marginBottom: "6px",
    color: "#ccc"
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "8px",
    border: "1px solid #555",
    background: "#222",
    color: "#fff",
    fontSize: "16px"
  },

  button: {
    width: "100%",
    marginTop: "20px",
    padding: "14px",
    border: "none",
    borderRadius: "8px",
    background: "#d4af37",
    color: "#080808",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer"
  },

  userList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  userRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "15px",
    background: "#222",
    border: "1px solid #444",
    borderRadius: "10px"
  },

  userName: {
    fontSize: "18px",
    fontWeight: "bold"
  },

  email: {
    color: "#aaa",
    marginTop: "3px"
  },

  details: {
    color: "#888",
    marginTop: "7px",
    fontSize: "14px"
  },

  deleteButton: {
    background: "#991b1b",
    color: "#fff",
    border: "none",
    padding: "9px 12px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  empty: {
    color: "#888"
  },

  denied: {
    maxWidth: "500px",
    margin: "100px auto",
    textAlign: "center",
    background: "#151515",
    padding: "30px",
    borderRadius: "12px",
    border: "1px solid #991b1b"
  }
};

export default Users;