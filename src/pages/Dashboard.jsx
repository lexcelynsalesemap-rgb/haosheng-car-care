import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import UserMenu from "../components/UserMenu";
import { supabase } from "../supabase/client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [jobServices, setJobServices] = useState([]);
  const [dateFilter, setDateFilter] = useState("All");

  useEffect(() => {
    loadDashboard();

    const jobsChannel = supabase
      .channel("dashboard-jobs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs"
        },
        () => loadJobs()
      )
      .subscribe();

    const paymentsChannel = supabase
      .channel("dashboard-payments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments"
        },
        () => loadPayments()
      )
      .subscribe();

    const servicesChannel = supabase
      .channel("dashboard-services")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_services"
        },
        () => loadJobServices()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(servicesChannel);
    };
  }, []);

  async function loadDashboard() {
    await Promise.all([
      loadJobs(),
      loadPayments(),
      loadJobServices()
    ]);
  }

  async function loadJobs() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error("LOAD JOBS ERROR:", error);
      return;
    }

    setJobs(data || []);
  }

  async function loadPayments() {
    const { data, error } = await supabase
      .from("payments")
      .select("*");

    if (error) {
      console.error("LOAD PAYMENTS ERROR:", error);
      return;
    }

    setPayments(data || []);
  }

  async function loadJobServices() {
    const { data, error } = await supabase
      .from("job_services")
      .select("*");

    if (error) {
      console.error(
        "LOAD JOB SERVICES ERROR:",
        error
      );
      return;
    }

    setJobServices(data || []);
  }

  // =============================
  // DATE FILTER
  // =============================

  const filteredJobs = jobs.filter((job) => {
    if (dateFilter === "All") {
      return true;
    }

    if (!job.created_at) {
      return false;
    }

    const jobDate = new Date(job.created_at);
    const now = new Date();

    if (dateFilter === "Today") {
      return (
        jobDate.toDateString() ===
        now.toDateString()
      );
    }

    if (dateFilter === "Month") {
      return (
        jobDate.getMonth() === now.getMonth() &&
        jobDate.getFullYear() ===
          now.getFullYear()
      );
    }

    if (dateFilter === "Year") {
      return (
        jobDate.getFullYear() ===
        now.getFullYear()
      );
    }

    return true;
  });

  // =============================
  // GENERAL DASHBOARD DATA
  // =============================

  const totalJobs = filteredJobs.length;

  const newJobs = filteredJobs.filter(
    (job) => (job.status || "New") === "New"
  ).length;

  const progressJobs = filteredJobs.filter(
    (job) => job.status === "In Progress"
  ).length;

  const finishedJobs = filteredJobs.filter(
    (job) => job.status === "Finished"
  ).length;

  const deliveredJobs = filteredJobs.filter(
    (job) => job.status === "Delivered"
  ).length;

  // =============================
  // FINANCIAL DATA
  // =============================

  const totalSales = filteredJobs.reduce(
    (sum, job) =>
      sum + Number(job.price || 0),
    0
  );

  const totalDiscount = filteredJobs.reduce(
    (sum, job) =>
      sum + Number(job.discount || 0),
    0
  );

  const netSales = Math.max(
    totalSales - totalDiscount,
    0
  );

  // Only count payments belonging
  // to jobs inside the selected filter.
  const filteredJobIds = new Set(
    filteredJobs.map((job) => job.id)
  );

  const filteredPayments = payments.filter(
    (payment) =>
      filteredJobIds.has(payment.job_id)
  );

  // =============================
  // CUSTOMER / SALES PAYMENTS
  //
  // Payments are NOT Teyseer payments.
  //
  // Teyseer WTT is paid monthly by Teyseer,
  // so customer deposits/payments belong
  // to the Sales side.
  // =============================

  const paid = filteredPayments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  );

  const balance = Math.max(
    netSales - paid,
    0
  );

  // =============================
  // SOURCE REPORT
  // =============================

  let teyseerNetSales = 0;
  let salesTeamNetSales = 0;

  const sourceReport = {
    "Teyseer Motors": {
      jobs: 0,
      sales: 0
    },

    Salah: {
      jobs: 0,
      sales: 0
    },

    Bahaa: {
      jobs: 0,
      sales: 0
    },

    "Sales Team": {
      jobs: 0,
      sales: 0
    }
  };

  // Keep track of jobs that contain
  // Teyseer-owned WTT.
  const teyseerJobIds = new Set();

  filteredJobs.forEach((job) => {
    const services = jobServices.filter(
      (service) =>
        service.job_id === job.id
    );

    services.forEach((service) => {
      const amount =
        Number(service.price || 0);

      const serviceName = (
        service.service_name ||
        service.name ||
        ""
      ).toLowerCase();

      let reportSource = "Sales Team";

      // =============================
      // DIRECT TEYSEER
      // =============================

      if (
        job.source === "Teyseer Motors"
      ) {
        reportSource = "Teyseer Motors";
      }

      // =============================
      // TEYSEER - SALAH
      // =============================

      else if (
        job.source ===
        "Teyseer Motors - Salah"
      ) {
        if (
          serviceName.includes("wtt")
        ) {
          reportSource = "Teyseer Motors";
        } else {
          reportSource = "Salah";
        }
      }

      // =============================
      // TEYSEER - BAHA
      // =============================

      else if (
        job.source ===
        "Teyseer Motors - Bahaa"
      ) {
        if (
          serviceName.includes("wtt")
        ) {
          reportSource = "Teyseer Motors";
        } else {
          reportSource = "Bahaa";
        }
      }

      // =============================
      // DIRECT BAHA
      // =============================

      else if (
        job.source === "Bahaa"
      ) {
        reportSource = "Bahaa";
      }

      // =============================
      // DIRECT SALAH
      // =============================

      else if (
        job.source === "Salah"
      ) {
        reportSource = "Salah";
      }

      if (!sourceReport[reportSource]) {
        sourceReport[reportSource] = {
          jobs: 0,
          sales: 0
        };
      }

      sourceReport[reportSource].jobs += 1;

      sourceReport[reportSource].sales +=
        amount;

      // =============================
      // TEYSEER SALES
      // =============================

      if (
        reportSource ===
        "Teyseer Motors"
      ) {
        teyseerNetSales += amount;

        teyseerJobIds.add(job.id);
      }

      // =============================
      // SALES TEAM
      // =============================

      else {
        salesTeamNetSales += amount;
      }
    });
  });

  // =============================
  // PAYMENT SPLIT
  //
  // IMPORTANT:
  //
  // Payments are CUSTOMER / SALES
  // payments.
  //
  // They are NOT Teyseer payments.
  //
  // Teyseer WTT is paid monthly by Teyseer.
  // =============================

  const salesTeamPaid =
    filteredPayments.reduce(
      (sum, payment) =>
        sum +
        Number(payment.amount || 0),
      0
    );

  // =============================
  // SALES TEAM BALANCE
  // =============================

  const salesTeamBalance = Math.max(
    salesTeamNetSales - salesTeamPaid,
    0
  );

  // =============================
  // CHART DATA
  // =============================

  const statusData = [
    {
      name: "New",
      value: newJobs
    },

    {
      name: "Progress",
      value: progressJobs
    },

    {
      name: "Finished",
      value: finishedJobs
    },

    {
      name: "Delivered",
      value: deliveredJobs
    }
  ];

  const salesData = [
    {
      name: "Sales",
      amount: netSales
    },

    {
      name: "Paid",
      amount: paid
    },

    {
      name: "Due",
      amount: balance
    }
  ];

  const COLORS = [
    "#d4af37",
    "#f59e0b",
    "#22c55e",
    "#0891b2"
  ];

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              🚗 Haosheng Car Care
            </h1>

            <p style={styles.subtitle}>
              Workshop Management System
            </p>
          </div>

          <div style={styles.headerActions}>
            <UserMenu />

            <Link
              to="/new-job"
              style={{
                textDecoration: "none"
              }}
            >
              <button
                style={styles.newButton}
              >
                + New Job
              </button>
            </Link>
<Link
  to="/inventory"
  style={{
    textDecoration: "none"
  }}
>
  <button
    style={styles.secondaryButton}
  >
    📦 Inventory
  </button>
</Link>
            <Link
              to="/technician-earnings"
              style={{
                textDecoration: "none"
              }}
            >
              <button
                style={styles.secondaryButton}
              >
                👷 Technician Earnings
              </button>
            </Link>
          </div>
        </div>

        {/* DATE FILTER */}

        <div style={styles.filterBox}>
          <label style={styles.filterLabel}>
            Dashboard Period
          </label>

          <select
            value={dateFilter}
            onChange={(e) =>
              setDateFilter(
                e.target.value
              )
            }
            style={styles.select}
          >
            <option value="All">
              All Time
            </option>

            <option value="Today">
              Today
            </option>

            <option value="Month">
              This Month
            </option>

            <option value="Year">
              This Year
            </option>
          </select>
        </div>

        {/* SUMMARY CARDS */}

        <div style={styles.cards}>

          <Card
            title="Total Jobs"
            value={totalJobs}
            icon="🚗"
          />

          <Card
            title="New"
            value={newJobs}
            icon="🆕"
            status="New"
          />

          <Card
            title="In Progress"
            value={progressJobs}
            icon="🔧"
            status="In Progress"
          />

          <Card
            title="Finished"
            value={finishedJobs}
            icon="✅"
            status="Finished"
          />

          <Card
            title="Delivered"
            value={deliveredJobs}
            icon="🚚"
            status="Delivered"
          />

          <Card
            title="Net Sales"
            value={`QAR ${netSales.toFixed(2)}`}
            icon="💰"
          />

          <Card
            title="Teyseer Sales"
            value={`QAR ${teyseerNetSales.toFixed(2)}`}
            icon="🏢"
          />

          <Card
            title="Sales Team Sales"
            value={`QAR ${salesTeamNetSales.toFixed(2)}`}
            icon="👥"
          />

          <Card
            title="Sales Team Paid"
            value={`QAR ${salesTeamPaid.toFixed(2)}`}
            icon="👥💳"
          />

          <Card
            title="Sales Team Balance"
            value={`QAR ${salesTeamBalance.toFixed(2)}`}
            icon="👥⚠️"
          />

          <Card
            title="Paid"
            value={`QAR ${paid.toFixed(2)}`}
            icon="💳"
          />

          <Card
            title="Balance Due"
            value={`QAR ${balance.toFixed(2)}`}
            icon="⚠️"
          />

        </div>

        {/* RECENT JOBS */}

        <h2 style={styles.heading}>
          Recent Jobs
        </h2>

        <div style={styles.tableBox}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  Customer
                </th>

                <th style={styles.th}>
                  Vehicle
                </th>

                <th style={styles.th}>
                  Status
                </th>

                <th style={styles.th}>
                  Price
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredJobs
                .slice(0, 5)
                .map((job) => (
                  <tr key={job.id}>
                    <td style={styles.td}>
                      {job.customer ||
                        "Unknown"}
                    </td>

                    <td style={styles.td}>
                      {job.carModel || "-"}
                    </td>

                    <td style={styles.td}>
                      <span
                        style={
                          styles.status
                        }
                      >
                        {job.status ||
                          "New"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      QAR{" "}
                      {Number(
                        job.price || 0
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {filteredJobs.length === 0 && (
            <p style={styles.empty}>
              No jobs found for this period.
            </p>
          )}
        </div>

        {/* STATISTICS */}

        <h2 style={styles.heading}>
          Statistics
        </h2>

        <div style={styles.charts}>

          {/* JOB STATUS */}

          <div style={styles.chartBox}>
            <h3 style={styles.chartTitle}>
              Job Status
            </h3>

            <ResponsiveContainer
              width="100%"
              height={250}
            >
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {statusData.map(
                    (entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          COLORS[index]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip
                  contentStyle={
                    styles.tooltip
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* FINANCIAL */}

          <div style={styles.chartBox}>
            <h3 style={styles.chartTitle}>
              Financial Overview
            </h3>

            <ResponsiveContainer
              width="100%"
              height={250}
            >
              <BarChart
                data={salesData}
              >
                <XAxis
                  dataKey="name"
                  stroke="#aaa"
                />

                <YAxis
                  stroke="#aaa"
                />

                <Tooltip
                  contentStyle={
                    styles.tooltip
                  }
                />

                <Bar
                  dataKey="amount"
                  fill="#d4af37"
                  radius={[
                    6,
                    6,
                    0,
                    0
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* CUSTOMER SOURCES */}

        <h2 style={styles.heading}>
          Customer Sources
        </h2>

        <div style={styles.recent}>
          {Object.entries(
            sourceReport
          ).map(
            ([name, data]) => (
              <div
                key={name}
                style={
                  styles.recentCard
                }
              >
                <h3
                  style={
                    styles.goldText
                  }
                >
                  {name}
                </h3>

                <h2
                  style={
                    styles.bigNumber
                  }
                >
                  {data.jobs}
                </h2>

                <p
                  style={
                    styles.muted
                  }
                >
                  Jobs
                </p>

                <h3>
                  Net Sales:{" "}
                  <span
                    style={
                      styles.goldText
                    }
                  >
                    QAR{" "}
                    {data.sales.toFixed(
                      2
                    )}
                  </span>
                </h3>
              </div>
            )
          )}
        </div>

        {/* QUICK ACTIONS */}

        <h2 style={styles.heading}>
          Quick Actions
        </h2>

        <div style={styles.actions}>

          <Link
            to="/new-job"
            style={styles.actionCard}
          >
            <div
              style={styles.actionIcon}
            >
              ➕
            </div>

            <h3>New Job</h3>

            <p>
              Create service order
            </p>
          </Link>

          <Link
            to="/jobs"
            style={styles.actionCard}
          >
            <div
              style={styles.actionIcon}
            >
              📋
            </div>

            <h3>Jobs</h3>

            <p>
              Manage repairs
            </p>
          </Link>

          <Link
            to="/jobs"
            style={styles.actionCard}
          >
            <div
              style={styles.actionIcon}
            >
              🧾
            </div>

            <h3>Invoice</h3>

            <p>
              Select a car to create
              invoice
            </p>
          </Link>

          <Link
            to="/settings"
            style={styles.actionCard}
          >
            <div
              style={styles.actionIcon}
            >
              ⚙️
            </div>

            <h3>Settings</h3>

            <p>
              System setup
            </p>
          </Link>

          <Link
            to="/reports"
            style={styles.actionCard}
          >
            <div
              style={styles.actionIcon}
            >
              📊
            </div>

            <h3>Reports</h3>

            <p>
              Financial overview
            </p>
          </Link>

    {/* INVENTORY */}
  <Link
    to="/inventory"
    style={styles.actionCard}
  >
    <div style={styles.actionIcon}>
      📦
    </div>

    <h3>Inventory</h3>

    <p>
      Manage products and stock
    </p>
  </Link>

</div>

      </div>
    </div>
  );
}

// =====================================
// DASHBOARD CARD
// =====================================

function Card({
  title,
  value,
  status,
  icon
}) {
  const colors = {
    "Total Jobs": "#d4af37",
    New: "#d4af37",
    "In Progress": "#f59e0b",
    Finished: "#22c55e",
    Delivered: "#0891b2",
    "Net Sales": "#d4af37",
    "Teyseer Sales": "#d4af37",
    "Sales Team Sales": "#0891b2",
    "Sales Team Paid": "#22c55e",
    "Sales Team Balance": "#f59e0b",
    Paid: "#22c55e",
    "Balance Due": "#dc2626"
  };

  const content = (
    <div
      style={{
        ...styles.card,
        borderTop:
          `4px solid ${
            colors[title] ||
            "#d4af37"
          }`
      }}
    >
      <div style={styles.icon}>
        {icon}
      </div>

      <h3 style={styles.cardTitle}>
        {title}
      </h3>

      <h2 style={styles.cardValue}>
        {value}
      </h2>
    </div>
  );

  if (status) {
    return (
      <Link
        to={`/jobs?status=${encodeURIComponent(
          status
        )}`}
        style={{
          textDecoration: "none"
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
}

// =====================================
// STYLES
// =====================================

const styles = {
  page: {
    minHeight: "100vh",
    padding: "30px",
    background: "#0b0b0b",
    color: "#f5f5f5",
    boxSizing: "border-box"
  },

  container: {
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "30px",
    flexWrap: "wrap"
  },

  title: {
    color: "#d4af37",
    fontSize: "30px",
    margin: 0
  },

  subtitle: {
    color: "#999",
    marginTop: "8px"
  },

  headerActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap"
  },

  newButton: {
    background: "#d4af37",
    color: "#080808",
    border: "none",
    padding: "12px 22px",
    borderRadius: "10px",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  secondaryButton: {
    background: "#222",
    color: "#f5f5f5",
    border: "1px solid #555",
    padding: "12px 18px",
    borderRadius: "10px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  filterBox: {
    background: "#151515",
    border: "1px solid #3b321c",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "25px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap"
  },

  filterLabel: {
    color: "#d4af37",
    fontWeight: "bold"
  },

  select: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #555",
    background: "#222",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer"
  },

  cards: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "18px",
    marginBottom: "40px"
  },

  card: {
    background: "#151515",
    padding: "22px",
    borderRadius: "12px",
    textAlign: "center",
    border: "1px solid #3b321c",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)",
    color: "#f5f5f5",
    minHeight: "150px",
    boxSizing: "border-box"
  },

  icon: {
    fontSize: "34px",
    marginBottom: "8px"
  },

  cardTitle: {
    color: "#aaa",
    margin: "5px 0 10px"
  },

  cardValue: {
    color: "#d4af37",
    margin: 0,
    fontSize: "24px"
  },

  heading: {
    color: "#d4af37",
    marginTop: "35px",
    marginBottom: "18px"
  },

  tableBox: {
    background: "#151515",
    border: "1px solid #3b321c",
    borderRadius: "12px",
    padding: "20px",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)",
    marginBottom: "40px",
    overflowX: "auto"
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left"
  },

  th: {
    color: "#d4af37",
    padding: "14px",
    borderBottom:
      "1px solid #3b321c"
  },

  td: {
    padding: "14px",
    borderBottom:
      "1px solid #292929",
    color: "#eee"
  },

  status: {
    background: "#3b321c",
    color: "#d4af37",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "14px"
  },

  charts: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(300px,1fr))",
    gap: "20px",
    marginBottom: "40px"
  },

  chartBox: {
    background: "#151515",
    border: "1px solid #3b321c",
    padding: "20px",
    borderRadius: "12px",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)"
  },

  chartTitle: {
    color: "#d4af37"
  },

  tooltip: {
    background: "#151515",
    border:
      "1px solid #d4af37",
    color: "#fff"
  },

  recent: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: "20px",
    marginBottom: "40px"
  },

  recentCard: {
    background: "#151515",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #3b321c",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)"
  },

  goldText: {
    color: "#d4af37"
  },

  bigNumber: {
    color: "#fff",
    fontSize: "32px",
    marginBottom: "0"
  },

  muted: {
    color: "#888"
  },

  actions: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: "20px",
    paddingBottom: "40px"
  },

  actionCard: {
    background: "#151515",
    padding: "25px",
    borderRadius: "12px",
    textDecoration: "none",
    color: "#f5f5f5",
    textAlign: "center",
    border: "1px solid #3b321c",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)",
    display: "block",
    transition: "0.2s"
  },

  actionIcon: {
    fontSize: "32px",
    marginBottom: "8px"
  },

  empty: {
    color: "#888",
    textAlign: "center",
    padding: "20px"
  }
};

export default Dashboard;