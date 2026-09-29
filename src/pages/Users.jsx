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

  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const loggedInUser = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  // -----------------------------------
  // LOAD USERS
  // -----------------------------------

  async function loadUsers() {
  setLoading(true);

  console.log("LOADING USERS...");

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, name, email, role, shop_id, auth_user_id"
    )
    .order("id", { ascending: true });

  console.log("USERS DATA:", data);
  console.log("USERS ERROR:", error);
  console.log("USERS COUNT:", data?.length);

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

  // -----------------------------------
  // INITIAL LOAD
  // -----------------------------------

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

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (!shopId) {
      alert("Please select a shop.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert(
          "Your session has expired. Please log in again."
        );
        return;
      }

      const { data, error } =
        await supabase.functions.invoke(
          "create-user",
          {
            body: {
              name: name.trim(),
              email: email.trim().toLowerCase(),
              password: password,
              role: role,
              shop_id: Number(shopId),
            },
          }
        );

      console.log(
        "CREATE USER RESPONSE:",
        data
      );

      console.log(
        "CREATE USER ERROR:",
        error
      );

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      alert("User created successfully.");

      setName("");
      setEmail("");
      setPassword("");
      setRole("staff");
      setShopId("");

      await loadUsers();

    } catch (error) {
      console.error(
        "CREATE USER ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Could not create user."
      );

    } finally {
      setSaving(false);
    }
  }

  // -----------------------------------
  // OPEN CHANGE PASSWORD
  // -----------------------------------

  function openChangePassword(user) {
    console.log(
      "CHANGE PASSWORD CLICKED:",
      user
    );

    if (!user.auth_user_id) {
      alert(
        "This user does not have a Supabase Auth account."
      );
      return;
    }

    setPasswordUser(user);
    setNewPassword("");
  }

  // -----------------------------------
  // SAVE NEW PASSWORD
  // -----------------------------------

  async function saveNewPassword() {
  console.log("SAVE NEW PASSWORD STARTED");

  if (!passwordUser) {
    console.log("NO PASSWORD USER");
    return;
  }

  console.log("PASSWORD USER:", passwordUser);

  if (!newPassword) {
    alert("Please enter a new password.");
    return;
  }

  if (newPassword.length < 6) {
    alert("Password must be at least 6 characters.");
    return;
  }

  setChangingPassword(true);

  try {
    console.log("GETTING SESSION...");

    const {
      data: sessionData,
      error: sessionError,
    } = await supabase.auth.getSession();

    console.log("SESSION DATA:", sessionData);
    console.log("SESSION ERROR:", sessionError);

    if (sessionError) {
      throw sessionError;
    }

    const session = sessionData?.session;

    console.log("SESSION EXISTS:", !!session);

    if (!session) {
      alert(
        "Your login session has expired. Please log in again."
      );
      return;
    }

    console.log(
      "CURRENT AUTH USER:",
      session.user.id
    );

    console.log(
      "TARGET DATABASE USER:",
      passwordUser.id
    );

    console.log(
      "TARGET AUTH USER:",
      passwordUser.auth_user_id
    );

    console.log(
      "CALLING CHANGE-PASSWORD FUNCTION..."
    );

    const {
      data,
      error,
    } = await supabase.functions.invoke(
      "change-password",
      {
        body: {
          user_id: passwordUser.id,
          new_password: newPassword,
        },
      }
    );

    console.log(
      "CHANGE PASSWORD RESPONSE:",
      data
    );

    console.log(
      "CHANGE PASSWORD ERROR:",
      error
    );

    if (error) {
      throw error;
    }

    if (!data?.success) {
      throw new Error(
        data?.error ||
          "Could not change password."
      );
    }

    alert(
      "Password changed successfully."
    );

    setPasswordUser(null);
    setNewPassword("");

  } catch (error) {
    console.error(
      "CHANGE PASSWORD ERROR:",
      error
    );

    alert(
      error instanceof Error
        ? error.message
        : "Could not change password."
    );

  } finally {
    setChangingPassword(false);
  }
}

  // -----------------------------------
  // DELETE USER
  // -----------------------------------

  async function deleteUser(user) {
    if (user.id === loggedInUser?.id) {
      alert(
        "You cannot delete your own account."
      );
      return;
    }

    if (!user.auth_user_id) {
      alert(
        "This user does not have a Supabase Auth account."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${user.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const {
        data,
        error,
      } = await supabase.functions.invoke(
        "delete-user",
        {
          body: {
            user_id: user.id,
            auth_user_id: user.auth_user_id,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "Could not delete user."
        );
      }

      alert(
        "User deleted successfully."
      );

      await loadUsers();

    } catch (error) {
      console.error(
        "DELETE USER ERROR:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Could not delete user."
      );
    }
  }

  // -----------------------------------
  // CHECK ADMIN
  // -----------------------------------

  if (loggedInUser?.role !== "admin") {
    return (
      <div style={styles.page}>
        <div style={styles.denied}>

          <h2>
            Access Denied
          </h2>

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

        {/* CHANGE PASSWORD MODAL */}

        {passwordUser && (
          <div style={styles.passwordModal}>

            <div style={styles.passwordBox}>

              <h2 style={styles.sectionTitle}>
                Change Password
              </h2>

              <p style={styles.passwordUserText}>
                {passwordUser.name}
              </p>

              <p style={styles.passwordEmailText}>
                {passwordUser.email}
              </p>

              <label style={styles.label}>
                New Password
              </label>

              <input
                type="password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                placeholder="Enter new password"
                style={styles.input}
                autoFocus
              />

              <p style={styles.passwordHint}>
                Password must be at least 6 characters.
              </p>

              <div style={styles.passwordActions}>

                <button
                  onClick={() => {
                    setPasswordUser(null);
                    setNewPassword("");
                  }}
                  style={styles.cancelButton}
                  disabled={changingPassword}
                >
                  CANCEL
                </button>

                <button
                  onClick={saveNewPassword}
                  style={{
                    ...styles.passwordButton,
                    opacity: changingPassword
                      ? 0.6
                      : 1,
                  }}
                  disabled={changingPassword}
                >
                  {changingPassword
                    ? "CHANGING..."
                    : "CHANGE PASSWORD"}
                </button>

              </div>

            </div>

          </div>
        )}

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
                {shop.name ||
                  `Shop ${shop.id}`}
              </option>
            ))}

          </select>

          <button
            onClick={createUser}
            disabled={saving}
            style={{
              ...styles.button,
              opacity: saving
                ? 0.6
                : 1,
            }}
          >
            {saving
              ? "CREATING..."
              : "CREATE USER"}
          </button>

        </div>

        {/* EXISTING USERS */}

        <div style={styles.card}>

          <h2 style={styles.sectionTitle}>
            Existing Users
          </h2>

          {loading ? (

            <p>
              Loading users...
            </p>

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

                  <div style={styles.userInfo}>

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

                  <div style={styles.actions}>

                    <button
                      onClick={() =>
                        openChangePassword(user)
                      }
                      style={styles.passwordButton}
                    >
                      Change Password
                    </button>

                    {user.id !==
                      loggedInUser?.id && (

                      <button
                        onClick={() =>
                          deleteUser(user)
                        }
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>

                    )}

                  </div>

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
    padding: "30px",
    boxSizing: "border-box",
  },

  container: {
    maxWidth: "750px",
    margin: "0 auto",
  },

  title: {
    color: "#d4af37",
    fontSize: "30px",
    marginBottom: "5px",
  },

  subtitle: {
    color: "#999",
    marginBottom: "25px",
  },

  card: {
    background: "#151515",
    border: "1px solid #3b321c",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
  },

  sectionTitle: {
    color: "#d4af37",
    marginTop: 0,
  },

  label: {
    display: "block",
    marginTop: "12px",
    marginBottom: "6px",
    color: "#ccc",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "8px",
    border: "1px solid #555",
    background: "#222",
    color: "#fff",
    fontSize: "16px",
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
    cursor: "pointer",
  },

  userList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  userRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "15px",
    background: "#222",
    border: "1px solid #444",
    borderRadius: "10px",
  },

  userInfo: {
    minWidth: 0,
    flex: 1,
  },

  userName: {
    fontSize: "18px",
    fontWeight: "bold",
  },

  email: {
    color: "#aaa",
    marginTop: "3px",
    wordBreak: "break-word",
  },

  details: {
    color: "#888",
    marginTop: "7px",
    fontSize: "14px",
  },

  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flexShrink: 0,
  },

  passwordButton: {
    background: "#d4af37",
    color: "#080808",
    border: "none",
    padding: "9px 12px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  deleteButton: {
    background: "#991b1b",
    color: "#fff",
    border: "none",
    padding: "9px 12px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  empty: {
    color: "#888",
  },

  denied: {
    maxWidth: "500px",
    margin: "100px auto",
    textAlign: "center",
    background: "#151515",
    padding: "30px",
    borderRadius: "12px",
    border: "1px solid #991b1b",
  },

  passwordModal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
    boxSizing: "border-box",
  },

  passwordBox: {
    width: "100%",
    maxWidth: "450px",
    background: "#151515",
    border: "1px solid #d4af37",
    borderRadius: "12px",
    padding: "25px",
    boxSizing: "border-box",
    boxShadow:
      "0 10px 40px rgba(0, 0, 0, 0.6)",
  },

  passwordUserText: {
    color: "#fff",
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "4px",
  },

  passwordEmailText: {
    color: "#999",
    marginTop: 0,
    marginBottom: "20px",
  },

  passwordHint: {
    color: "#777",
    fontSize: "13px",
    marginTop: "7px",
  },

  passwordActions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },

  cancelButton: {
    flex: 1,
    padding: "12px",
    border: "1px solid #555",
    borderRadius: "8px",
    background: "#222",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Users;
