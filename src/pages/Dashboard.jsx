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
  Tooltip,
} from "recharts";

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dateFilter, setDateFilter] = useState("All");
  const [selectedSalesStaff, setSelectedSalesStaff] = useState(null);
  const [staffCustomerSearch, setStaffCustomerSearch] = useState("");

  // ==========================================
  // LOAD
  // ==========================================
const user = JSON.parse(
  localStorage.getItem("user") || "null"
);

const isAdmin =
  String(user?.role || "")
    .trim()
    .toLowerCase() === "admin";

  useEffect(() => {
    loadDashboard();

    const jobsChannel = supabase
      .channel("dashboard-jobs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
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
          table: "payments",
        },
        () => loadPayments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, []);

  async function loadDashboard() {
    await Promise.all([
      loadJobs(),
      loadPayments(),
    ]);
  }

  async function loadJobs() {
    const user = JSON.parse(
      localStorage.getItem("user")
    );

    const shopId = user?.shop_id;

    if (!shopId) {
      console.error("NO SHOP ID FOUND");
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("jobs")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "LOAD JOBS ERROR:",
        error
      );
      return;
    }

    setJobs(data || []);
  }

  async function loadPayments() {
    const user = JSON.parse(
      localStorage.getItem("user")
    );

    const shopId = user?.shop_id;

    if (!shopId) {
      console.error("NO SHOP ID FOUND");
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("payments")
      .select(`
        *,
        jobs!inner(shop_id)
      `)
      .eq("jobs.shop_id", shopId);

    if (error) {
      console.error(
        "LOAD PAYMENTS ERROR:",
        error
      );
      return;
    }

    setPayments(data || []);
  }

  // ==========================================
  // HELPERS
  // ==========================================

  function money(value) {
    return Number(value || 0).toFixed(2);
  }

  function normalizeSource(source) {
    return String(source || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function isPureTeyseerSource(source) {
    return (
      normalizeSource(source) ===
      "teyseer motors"
    );
  }

  function isTeyseerSalahSource(source) {
    const value = normalizeSource(source);

    return (
      value === "teyseer motors - salah" ||
      value === "teyseer motors-salah" ||
      value === "teyseer-salah"
    );
  }

  function isTeyseerBahaaSource(source) {
    const value = normalizeSource(source);

    return (
      value === "teyseer motors - bahaa" ||
      value === "teyseer motors-bahaa" ||
      value === "teyseer-bahaa"
    );
  }

  function isTeyseerAbdouSource(source) {
    const value = normalizeSource(source);

    return (
      value === "teyseer motors - abdou" ||
      value === "teyseer motors-abdou" ||
      value === "teyseer-abdou"
    );
  }

  function isWttService(serviceName) {
    return String(serviceName || "")
      .toLowerCase()
      .includes("wtt");
  }

  // ==========================================
  // SERVICE GROSS
  //
  // IMPORTANT:
  // Dashboard uses the same value saved by
  // NewJob:
  //
  // price × quantity - service discount
  // ==========================================

  function getServiceGross(
    serviceName,
    serviceDetails
  ) {
    const details =
      serviceDetails?.[serviceName] || {};

    const price = Number(
      details.price || 0
    );

    const quantity = Number(
      details.quantity || 1
    );

    const serviceDiscount = Number(
      details.discount || 0
    );

    return Math.max(
      price * quantity -
        serviceDiscount,
      0
    );
  }

  // ==========================================
  // JOB GROSS
  // ==========================================

  function getJobGross(job) {
    const services = Array.isArray(
      job?.services
    )
      ? job.services
      : [];

    const serviceDetails =
      job?.serviceDetails &&
      typeof job.serviceDetails === "object"
        ? job.serviceDetails
        : {};

    return services.reduce(
      (total, serviceName) => {
        return (
          total +
          getServiceGross(
            serviceName,
            serviceDetails
          )
        );
      },
      0
    );
  }

  // ==========================================
  // SALES BREAKDOWN
  //
  // Teyseer Motors
  //   -> ALL = Teyseer
  //
  // Teyseer Motors - Salah
  //   -> WTT = Teyseer
  //   -> Other = Salah
  //
  // Teyseer Motors - Bahaa
  //   -> WTT = Teyseer
  //   -> Other = Bahaa
  //
  // Teyseer Motors - Abdou
  //   -> WTT = Teyseer
  //   -> Other = Abdou
  //
  // Salah
  //   -> ALL = Salah
  //
  // Bahaa
  //   -> ALL = Bahaa
  //
  // Abdou
  //   -> ALL = Abdou
  //
  // Walk-in / Other
  //   -> ALL = Sales Team
  // ==========================================

  function getJobSalesBreakdown(job) {
    const services = Array.isArray(
      job?.services
    )
      ? job.services
      : [];

    const serviceDetails =
      job?.serviceDetails &&
      typeof job.serviceDetails === "object"
        ? job.serviceDetails
        : {};

    const source =
      normalizeSource(job?.source);

    let gross = 0;

    let teyseer = 0;
    let salah = 0;
    let bahaa = 0;
    let abdou = 0;
    let salesTeam = 0;

    services.forEach((serviceName) => {
      const amount =
        getServiceGross(
          serviceName,
          serviceDetails
        );

      gross += amount;

      const isWtt =
        isWttService(serviceName);

      // ======================================
      // PURE TEYSEER
      // ======================================

      if (
        isPureTeyseerSource(source)
      ) {
        teyseer += amount;
        return;
      }

      // ======================================
      // TEYSEER - SALAH
      // ======================================

      if (
        isTeyseerSalahSource(source)
      ) {
        if (isWtt) {
          teyseer += amount;
        } else {
          salah += amount;
        }

        return;
      }

      // ======================================
      // TEYSEER - BAHAA
      // ======================================

      if (
        isTeyseerBahaaSource(source)
      ) {
        if (isWtt) {
          teyseer += amount;
        } else {
          bahaa += amount;
        }

        return;
      }

      // ======================================
      // TEYSEER - ABDOU
      // ======================================

      if (
        isTeyseerAbdouSource(source)
      ) {
        if (isWtt) {
          teyseer += amount;
        } else {
          abdou += amount;
        }

        return;
      }

      // ======================================
      // NORMAL SALAH
      // ======================================

      if (source === "salah") {
        salah += amount;
        return;
      }

      // ======================================
      // NORMAL BAHAA
      // ======================================

      if (source === "bahaa") {
        bahaa += amount;
        return;
      }

      // ======================================
      // NORMAL ABDOU
      // ======================================

      if (source === "abdou") {
        abdou += amount;
        return;
      }

      // ======================================
      // WALK-IN / OTHER
      // ======================================

      salesTeam += amount;
    });

    const customerSales =
      salah +
      bahaa +
      abdou +
      salesTeam;

    return {
      gross,
      teyseer,
      salah,
      bahaa,
      abdou,
      salesTeam,
      customerSales,
    };
  }

  // ==========================================
  // DATE FILTER
  // ==========================================

  const filteredJobs = jobs.filter(
    (job) => {
      if (dateFilter === "All") {
        return true;
      }

      if (!job.created_at) {
        return false;
      }

      const jobDate =
        new Date(job.created_at);

      const now = new Date();

      if (dateFilter === "Today") {
        return (
          jobDate.toDateString() ===
          now.toDateString()
        );
      }

      if (dateFilter === "Month") {
        return (
          jobDate.getMonth() ===
            now.getMonth() &&
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
    }
  );

  // ==========================================
  // JOB COUNTS
  // ==========================================

  const totalJobs =
    filteredJobs.length;

  const newJobs =
    filteredJobs.filter(
      (job) =>
        (job.status || "New") ===
        "New"
    ).length;

  const progressJobs =
    filteredJobs.filter(
      (job) =>
        job.status === "In Progress"
    ).length;

  const finishedJobs =
    filteredJobs.filter(
      (job) =>
        job.status === "Finished"
    ).length;

  const deliveredJobs =
    filteredJobs.filter(
      (job) =>
        job.status === "Delivered"
    ).length;

  // ==========================================
  // SALES CALCULATION
  // ==========================================

  let teyseerSales = 0;
  let salahSales = 0;
  let bahaaSales = 0;
  let abdouSales = 0;
  let salesTeamSales = 0;

  let rawGrossSales = 0;

  filteredJobs.forEach((job) => {
    const breakdown =
      getJobSalesBreakdown(job);

    teyseerSales +=
      breakdown.teyseer;

    salahSales +=
      breakdown.salah;

    bahaaSales +=
      breakdown.bahaa;

    abdouSales +=
      breakdown.abdou;

    salesTeamSales +=
      breakdown.salesTeam;

    rawGrossSales +=
      breakdown.gross;
  });

  const customerSales =
    salahSales +
    bahaaSales +
    abdouSales +
    salesTeamSales;

  const totalSales =
    teyseerSales +
    customerSales;

  // ==========================================
  // DEBUG
  // ==========================================

  console.log(
    "========== SALES CALCULATION =========="
  );

  console.log(
    "TEYSEER SALES:",
    teyseerSales
  );

  console.log(
    "SALAH SALES:",
    salahSales
  );

  console.log(
    "BAHAA SALES:",
    bahaaSales
  );

  console.log(
    "ABDOU SALES:",
    abdouSales
  );

  console.log(
    "SALES TEAM SALES:",
    salesTeamSales
  );

  console.log(
    "CUSTOMER / PERSONAL SALES:",
    customerSales
  );

  console.log(
    "CALCULATED TOTAL SALES:",
    totalSales
  );

  console.log(
    "RAW GROSS SALES:",
    rawGrossSales
  );

  console.log(
    "DIFFERENCE:",
    totalSales - rawGrossSales
  );

  console.log(
    "======================================="
  );

  // ==========================================
  // PAYMENTS
  // ==========================================

  const filteredJobIds =
    new Set(
      filteredJobs.map(
        (job) => job.id
      )
    );

  const filteredPayments =
    payments.filter(
      (payment) =>
        filteredJobIds.has(
          payment.job_id
        )
    );

  let customerPaid = 0;
  let teyseerPaid = 0;

  // Individual sales-staff payment totals.
  // These use the exact same sales breakdown as the dashboard.
  let salahPaid = 0;
  let bahaaPaid = 0;
  let abdouPaid = 0;
  let salesTeamPaid = 0;

  filteredPayments.forEach(
    (payment) => {
      const job =
        filteredJobs.find(
          (item) =>
            item.id ===
            payment.job_id
        );

      if (!job) {
        return;
      }

      const breakdown =
        getJobSalesBreakdown(job);

      const paymentAmount =
        Number(
          payment.amount || 0
        );

      if (paymentAmount <= 0) {
        return;
      }

      // ======================================
      // PURE TEYSEER JOB
      // ======================================

      if (
        breakdown.teyseer > 0 &&
        breakdown.customerSales <= 0
      ) {
        teyseerPaid +=
          paymentAmount;

        return;
      }

      // ======================================
      // CUSTOMER / PERSONAL / SALES TEAM JOB
      //
      // Keep the existing dashboard logic for
      // total customer paid.
      //
      // Also distribute the same payment among
      // the individual sales staff according to
      // their share of the customer-side sales.
      // This keeps: staff paid total = customer paid.
      // ======================================

      if (
        breakdown.customerSales > 0
      ) {
        customerPaid +=
          paymentAmount;

        const customerBase =
          breakdown.customerSales;

        // Salah share
        if (breakdown.salah > 0) {
          salahPaid +=
            paymentAmount *
            (breakdown.salah / customerBase);
        }

        // Bahaa share
        if (breakdown.bahaa > 0) {
          bahaaPaid +=
            paymentAmount *
            (breakdown.bahaa / customerBase);
        }

        // Abdou share
        if (breakdown.abdou > 0) {
          abdouPaid +=
            paymentAmount *
            (breakdown.abdou / customerBase);
        }

        // Sales Team share
        if (breakdown.salesTeam > 0) {
          salesTeamPaid +=
            paymentAmount *
            (breakdown.salesTeam / customerBase);
        }
      }
    }
  );

  // ==========================================
  // INDIVIDUAL SALES-STAFF BALANCES
  //
  // Balance = sales assigned to the staff
  //           - payments allocated to the staff
  // ==========================================

  const salahBalance =
    Math.max(
      salahSales - salahPaid,
      0
    );

  const bahaaBalance =
    Math.max(
      bahaaSales - bahaaPaid,
      0
    );

  const abdouBalance =
    Math.max(
      abdouSales - abdouPaid,
      0
    );

  const salesTeamBalance =
    Math.max(
      salesTeamSales - salesTeamPaid,
      0
    );

  const salesStaffBalanceTotal =
    salahBalance +
    bahaaBalance +
    abdouBalance +
    salesTeamBalance;

  // ==========================================
  // BALANCES
  // ==========================================

  const customerBalance =
    Math.max(
      customerSales -
        customerPaid,
      0
    );

  const teyseerBalance =
    Math.max(
      teyseerSales -
        teyseerPaid,
      0
    );

  // ==========================================
  // SALES STAFF OUTSTANDING CUSTOMER LISTS
  // ==========================================

  const paymentByJobId = {};

  filteredPayments.forEach((payment) => {
    const amount = Number(payment.amount || 0);
    if (amount > 0) {
      paymentByJobId[payment.job_id] =
        (paymentByJobId[payment.job_id] || 0) + amount;
    }
  });

  const salesStaffCustomerRows = {
    Salah: [],
    Bahaa: [],
    Abdou: [],
    "Sales Team": [],
  };

  const staffKeys = {
    Salah: "salah",
    Bahaa: "bahaa",
    Abdou: "abdou",
    "Sales Team": "salesTeam",
  };

  filteredJobs.forEach((job) => {
    const breakdown = getJobSalesBreakdown(job);
    const jobPaymentTotal = paymentByJobId[job.id] || 0;
    const customerSidePaid = Math.min(
      Math.max(jobPaymentTotal, 0),
      Math.max(breakdown.customerSales, 0)
    );

    Object.entries(staffKeys).forEach(([staffName, staffKey]) => {
      const staffSales = Number(breakdown[staffKey] || 0);

      if (staffSales <= 0) return;

      const staffPaid =
        breakdown.customerSales > 0
          ? customerSidePaid *
            (staffSales / breakdown.customerSales)
          : 0;

      const staffBalance = Math.max(
        staffSales - staffPaid,
        0
      );

      if (staffBalance <= 0) return;

      salesStaffCustomerRows[staffName].push({
        job,
        sales: staffSales,
        paid: staffPaid,
        balance: staffBalance,
      });
    });
  });

  const selectedStaffRows = selectedSalesStaff
    ? salesStaffCustomerRows[selectedSalesStaff] || []
    : [];

  const normalizedStaffSearch = staffCustomerSearch
    .trim()
    .toLowerCase();

  const visibleStaffRows = selectedStaffRows.filter((row) => {
    if (!normalizedStaffSearch) return true;

    const job = row.job;
    const searchable = [
      job.customer,
      job.carModel,
      job.vehicle,
      job.plateNumber,
      job.plate,
      job.licensePlate,
      job.source,
      job.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedStaffSearch);
  });

  // ==========================================
  // SOURCE REPORT
  // ==========================================

  const sourceReport = {
    "Teyseer Motors": {
      jobs: 0,
      sales: 0,
    },

    Salah: {
      jobs: 0,
      sales: 0,
    },

    Bahaa: {
      jobs: 0,
      sales: 0,
    },

    Abdou: {
      jobs: 0,
      sales: 0,
    },

    "Sales Team": {
      jobs: 0,
      sales: 0,
    },
  };

  filteredJobs.forEach((job) => {
    const services =
      Array.isArray(job.services)
        ? job.services
        : [];

    const serviceDetails =
      job.serviceDetails &&
      typeof job.serviceDetails ===
        "object"
        ? job.serviceDetails
        : {};

    const source =
      normalizeSource(job.source);

    services.forEach(
      (serviceName) => {
        const amount =
          getServiceGross(
            serviceName,
            serviceDetails
          );

        const isWtt =
          isWttService(
            serviceName
          );

        let reportSource =
          "Sales Team";

        // ====================================
        // PURE TEYSEER
        // ====================================

        if (
          isPureTeyseerSource(source)
        ) {
          reportSource =
            "Teyseer Motors";
        }

        // ====================================
        // TEYSEER - SALAH
        // ====================================

        else if (
          isTeyseerSalahSource(source)
        ) {
          reportSource =
            isWtt
              ? "Teyseer Motors"
              : "Salah";
        }

        // ====================================
        // TEYSEER - BAHAA
        // ====================================

        else if (
          isTeyseerBahaaSource(source)
        ) {
          reportSource =
            isWtt
              ? "Teyseer Motors"
              : "Bahaa";
        }

        // ====================================
        // TEYSEER - ABDOU
        // ====================================

        else if (
          isTeyseerAbdouSource(source)
        ) {
          reportSource =
            isWtt
              ? "Teyseer Motors"
              : "Abdou";
        }

        // ====================================
        // NORMAL SALAH
        // ====================================

        else if (
          source === "salah"
        ) {
          reportSource =
            "Salah";
        }

        // ====================================
        // NORMAL BAHAA
        // ====================================

        else if (
          source === "bahaa"
        ) {
          reportSource =
            "Bahaa";
        }

        // ====================================
        // NORMAL ABDOU
        // ====================================

        else if (
          source === "abdou"
        ) {
          reportSource =
            "Abdou";
        }

        // ====================================
        // WALK-IN / OTHER
        // ====================================

        else {
          reportSource =
            "Sales Team";
        }

        if (
          !sourceReport[
            reportSource
          ]
        ) {
          sourceReport[
            reportSource
          ] = {
            jobs: 0,
            sales: 0,
          };
        }

        sourceReport[
          reportSource
        ].jobs += 1;

        sourceReport[
          reportSource
        ].sales += amount;
      }
    );
  });

  // ==========================================
  // CHART DATA
  // ==========================================

  const statusData = [
    {
      name: "New",
      value: newJobs,
    },
    {
      name: "Progress",
      value: progressJobs,
    },
    {
      name: "Finished",
      value: finishedJobs,
    },
    {
      name: "Delivered",
      value: deliveredJobs,
    },
  ];

  const salesData = [
    {
      name: "Teyseer",
      amount: teyseerSales,
    },
    {
      name: "Salah",
      amount: salahSales,
    },
    {
      name: "Bahaa",
      amount: bahaaSales,
    },
    {
      name: "Abdou",
      amount: abdouSales,
    },
    {
      name: "Sales Team",
      amount: salesTeamSales,
    },
  ];

  const COLORS = [
    "#d4af37",
    "#f59e0b",
    "#22c55e",
    "#0891b2",
  ];

  // ==========================================
  // RENDER
  // ==========================================

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
                textDecoration: "none",
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
                textDecoration: "none",
              }}
            >
              <button
                style={
                  styles.secondaryButton
                }
              >
                📦 Inventory
              </button>
            </Link>

            <Link
              to="/technician-earnings"
              style={{
                textDecoration: "none",
              }}
            >
              <button
                style={
                  styles.secondaryButton
                }
              >
                👷 Technician Earnings
              </button>
            </Link>
          </div>
        </div>

        {/* DATE FILTER */}

        <div style={styles.filterBox}>
          <label
            style={styles.filterLabel}
          >
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
            title="Total Sales"
            value={`QAR ${money(
              totalSales
            )}`}
            icon="💰"
          />

          <Card
            title="Teyseer Sales"
            value={`QAR ${money(
              teyseerSales
            )}`}
            icon="🏢"
          />

          <Card
            title="Salah Sales"
            value={`QAR ${money(
              salahSales
            )}`}
            icon="👤"
          />

          <Card
            title="Bahaa Sales"
            value={`QAR ${money(
              bahaaSales
            )}`}
            icon="👤"
          />

          <Card
            title="Abdou Sales"
            value={`QAR ${money(
              abdouSales
            )}`}
            icon="👤"
          />

          <Card
            title="Sales Team Sales"
            value={`QAR ${money(
              salesTeamSales
            )}`}
            icon="💵"
          />

          {/* INDIVIDUAL SALES-STAFF BALANCES */}

          <Card
            title="Salah Balance"
            value={`QAR ${money(
              salahBalance
            )}`}
            icon="⚠️"
            onClick={() => {
              setSelectedSalesStaff("Salah");
              setStaffCustomerSearch("");
            }}
          />

          <Card
            title="Bahaa Balance"
            value={`QAR ${money(
              bahaaBalance
            )}`}
            icon="⚠️"
            onClick={() => {
              setSelectedSalesStaff("Bahaa");
              setStaffCustomerSearch("");
            }}
          />

          <Card
            title="Abdou Balance"
            value={`QAR ${money(
              abdouBalance
            )}`}
            icon="⚠️"
            onClick={() => {
              setSelectedSalesStaff("Abdou");
              setStaffCustomerSearch("");
            }}
          />

          <Card
            title="Sales Team Balance"
            value={`QAR ${money(
              salesTeamBalance
            )}`}
            icon="⚠️"
            onClick={() => {
              setSelectedSalesStaff("Sales Team");
              setStaffCustomerSearch("");
            }}
          />

          <Card
            title="Total Sales Staff Balance"
            value={`QAR ${money(
              salesStaffBalanceTotal
            )}`}
            icon="📊"
          />

          <Card
            title="Salah Paid"
            value={`QAR ${money(
              salahPaid
            )}`}
            icon="💳"
          />

          <Card
            title="Bahaa Paid"
            value={`QAR ${money(
              bahaaPaid
            )}`}
            icon="💳"
          />

          <Card
            title="Abdou Paid"
            value={`QAR ${money(
              abdouPaid
            )}`}
            icon="💳"
          />

          <Card
            title="Sales Team Paid"
            value={`QAR ${money(
              salesTeamPaid
            )}`}
            icon="💳"
          />

          <Card
            title="Customer / Personal Sales"
            value={`QAR ${money(
              customerSales
            )}`}
            icon="💰"
          />

          <Card
            title="Customer / Personal Paid"
            value={`QAR ${money(
              customerPaid
            )}`}
            icon="💳"
          />

          <Card
            title="Customer / Personal Balance"
            value={`QAR ${money(
              customerBalance
            )}`}
            icon="⚠️"
          />

          <Card
            title="Teyseer Paid"
            value={`QAR ${money(
              teyseerPaid
            )}`}
            icon="🏢💳"
          />

          <Card
            title="Teyseer Balance"
            value={`QAR ${money(
              teyseerBalance
            )}`}
            icon="🏢⚠️"
          />
        </div>

        {/* INDIVIDUAL SALES STAFF BALANCE */}

        <h2 style={styles.heading}>
          Individual Sales Staff Balances
        </h2>

        <div style={styles.tableBox}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Sales Staff</th>
                <th style={styles.th}>Sales</th>
                <th style={styles.th}>Paid</th>
                <th style={styles.th}>Balance</th>
                <th style={styles.th}>Collection %</th>
              </tr>
            </thead>

            <tbody>
              {[
                {
                  name: "Salah",
                  sales: salahSales,
                  paid: salahPaid,
                  balance: salahBalance,
                },
                {
                  name: "Bahaa",
                  sales: bahaaSales,
                  paid: bahaaPaid,
                  balance: bahaaBalance,
                },
                {
                  name: "Abdou",
                  sales: abdouSales,
                  paid: abdouPaid,
                  balance: abdouBalance,
                },
                {
                  name: "Sales Team",
                  sales: salesTeamSales,
                  paid: salesTeamPaid,
                  balance: salesTeamBalance,
                },
              ].map((staff) => {
                const collection =
                  staff.sales > 0
                    ? Math.min(
                        (staff.paid / staff.sales) * 100,
                        100
                      )
                    : 0;

                return (
                  <tr key={staff.name}>
                    <td style={{ ...styles.td, fontWeight: "bold" }}>
                      {staff.name}
                    </td>

                    <td style={styles.td}>
                      QAR {money(staff.sales)}
                    </td>

                    <td style={styles.paidTd}>
                      QAR {money(staff.paid)}
                    </td>

                    <td style={styles.balanceTd}>
                      QAR {money(staff.balance)}
                    </td>

                    <td style={styles.td}>
                      {collection.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}

              <tr>
                <td style={styles.totalTd}>
                  TOTAL
                </td>
                <td style={styles.totalTd}>
                  QAR {money(customerSales)}
                </td>
                <td style={styles.totalPaidTd}>
                  QAR {money(customerPaid)}
                </td>
                <td style={styles.totalBalanceTd}>
                  QAR {money(salesStaffBalanceTotal)}
                </td>
                <td style={styles.totalTd}>
                  {customerSales > 0
                    ? Math.min(
                        (customerPaid / customerSales) * 100,
                        100
                      ).toFixed(1)
                    : "0.0"}%
                </td>
              </tr>
            </tbody>
          </table>
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
                  Source
                </th>

                <th style={styles.th}>
                  Status
                </th>

                <th style={styles.th}>
                  Amount
                </th>

                <th style={styles.th}>
                  Teyseer
                </th>

                <th style={styles.th}>
                  Salah
                </th>

                <th style={styles.th}>
                  Bahaa
                </th>

                <th style={styles.th}>
                  Abdou
                </th>

                <th style={styles.th}>
                  Sales Team
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredJobs
                .slice(0, 5)
                .map((job) => {
                  const breakdown =
                    getJobSalesBreakdown(
                      job
                    );

                  return (
                    <tr
                      key={job.id}
                    >
                      <td style={styles.td}>
                        {job.customer ||
                          "Unknown"}
                      </td>

                      <td style={styles.td}>
                        {job.carModel ||
                          "-"}
                      </td>

                      <td style={styles.td}>
                        {job.source ||
                          "-"}
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
                        {money(
                          breakdown.gross
                        )}
                      </td>

                      <td style={styles.td}>
                        QAR{" "}
                        {money(
                          breakdown.teyseer
                        )}
                      </td>

                      <td style={styles.td}>
                        QAR{" "}
                        {money(
                          breakdown.salah
                        )}
                      </td>

                      <td style={styles.td}>
                        QAR{" "}
                        {money(
                          breakdown.bahaa
                        )}
                      </td>

                      <td style={styles.td}>
                        QAR{" "}
                        {money(
                          breakdown.abdou
                        )}
                      </td>

                      <td style={styles.td}>
                        QAR{" "}
                        {money(
                          breakdown.salesTeam
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {filteredJobs.length ===
            0 && (
            <p style={styles.empty}>
              No jobs found for this
              period.
            </p>
          )}
        </div>

        {/* STATISTICS */}

        <h2 style={styles.heading}>
          Statistics
        </h2>

        <div style={styles.charts}>

          <div style={styles.chartBox}>
            <h3
              style={styles.chartTitle}
            >
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
                    (
                      entry,
                      index
                    ) => (
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

          <div style={styles.chartBox}>
            <h3
              style={styles.chartTitle}
            >
              Sales Overview
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
                    0,
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
                  style={styles.muted}
                >
                  Service Items
                </p>

                <h3>
                  Gross Sales:{" "}
                  <span
                    style={
                      styles.goldText
                    }
                  >
                    QAR{" "}
                    {money(
                      data.sales
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
            style={
              styles.actionCard
            }
          >
            <div
              style={
                styles.actionIcon
              }
            >
              ➕
            </div>

            <h3>
              New Job
            </h3>

            <p>
              Create service order
            </p>
          </Link>

          <Link
            to="/jobs"
            style={
              styles.actionCard
            }
          >
            <div
              style={
                styles.actionIcon
              }
            >
              📋
            </div>

            <h3>
              Jobs
            </h3>

            <p>
              Manage repairs
            </p>
          </Link>

          <Link
            to="/jobs"
            style={
              styles.actionCard
            }
          >
            <div
              style={
                styles.actionIcon
              }
            >
              🧾
            </div>

            <h3>
              Invoice
            </h3>

            <p>
              Select a car to create
              invoice
            </p>
          </Link>

          <Link
            to="/settings"
            style={
              styles.actionCard
            }
          >
            <div
              style={
                styles.actionIcon
              }
            >
              ⚙️
            </div>

            <h3>
              Settings
            </h3>

            <p>
              System setup
            </p>
          </Link>

          {isAdmin && (
  <Link
    to="/reports"
    style={styles.actionCard}
  >
    <div style={styles.actionIcon}>
      📊
    </div>

    <h3>
      Reports
    </h3>

    <p>
      Financial overview
    </p>
  </Link>
)}

          <Link
            to="/inventory"
            style={
              styles.actionCard
            }
          >
            <div
              style={
                styles.actionIcon
              }
            >
              📦
            </div>

            <h3>
              Inventory
            </h3>

            <p>
              Manage products and stock
            </p>
          </Link>
        </div>

        {/* SALES STAFF OUTSTANDING CUSTOMERS MODAL */}
        {selectedSalesStaff && (
          <div
            style={styles.modalOverlay}
            onClick={() => setSelectedSalesStaff(null)}
          >
            <div
              style={styles.modal}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>
                    {selectedSalesStaff} — Outstanding Customers
                  </h2>
                  <p style={styles.modalSubtitle}>
                    Customers/jobs with an unpaid balance assigned to {selectedSalesStaff}.
                  </p>
                </div>

                <button
                  type="button"
                  style={styles.modalCloseButton}
                  onClick={() => setSelectedSalesStaff(null)}
                >
                  ×
                </button>
              </div>

              <div style={styles.modalSummaryRow}>
                <div style={styles.modalSummaryCard}>
                  <span style={styles.modalSummaryLabel}>Customers / Jobs</span>
                  <strong style={styles.modalSummaryValue}>
                    {selectedStaffRows.length}
                  </strong>
                </div>

                <div style={styles.modalSummaryCard}>
                  <span style={styles.modalSummaryLabel}>Outstanding Balance</span>
                  <strong style={styles.modalBalanceValue}>
                    QAR {money(
                      selectedStaffRows.reduce(
                        (sum, row) => sum + row.balance,
                        0
                      )
                    )}
                  </strong>
                </div>
              </div>

              <input
                type="text"
                value={staffCustomerSearch}
                onChange={(event) =>
                  setStaffCustomerSearch(event.target.value)
                }
                placeholder="Search customer, vehicle, plate, source, or job ID..."
                style={styles.modalSearch}
              />

              <div style={styles.modalTableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Customer</th>
                      <th style={styles.th}>Vehicle</th>
                      <th style={styles.th}>Source</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Sales</th>
                      <th style={styles.th}>Paid</th>
                      <th style={styles.th}>Balance</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleStaffRows.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={styles.empty}>
                          {selectedStaffRows.length === 0
                            ? "No outstanding customers for this sales staff."
                            : "No customers match your search."}
                        </td>
                      </tr>
                    ) : (
                      visibleStaffRows.map((row) => {
                        const job = row.job;
                        const vehicle =
                          job.carModel ||
                          job.vehicle ||
                          "-";
                        const plate =
                          job.plateNumber ||
                          job.plate ||
                          job.licensePlate ||
                          "";

                        return (
                          <tr key={`${selectedSalesStaff}-${job.id}`}>
                            <td style={{ ...styles.td, fontWeight: "bold" }}>
                              {job.customer || "Walk-in Customer"}
                            </td>

                            <td style={styles.td}>
                              {vehicle}
                              {plate ? ` • ${plate}` : ""}
                            </td>

                            <td style={styles.td}>
                              {job.source || "-"}
                            </td>

                            <td style={styles.td}>
                              {job.created_at
                                ? new Date(job.created_at).toLocaleDateString()
                                : "-"}
                            </td>

                            <td style={styles.td}>
                              QAR {money(row.sales)}
                            </td>

                            <td style={styles.paidTd}>
                              QAR {money(row.paid)}
                            </td>

                            <td style={styles.balanceTd}>
                              QAR {money(row.balance)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// CARD
// ==========================================

function Card({
  title,
  value,
  status,
  icon,
  onClick,
}) {
  const colors = {
    "Total Jobs": "#d4af37",
    New: "#d4af37",
    "In Progress": "#f59e0b",
    Finished: "#22c55e",
    Delivered: "#0891b2",

    "Total Sales": "#d4af37",

    "Teyseer Sales": "#d4af37",

    "Salah Sales": "#d4af37",

    "Bahaa Sales": "#d4af37",

    "Abdou Sales": "#d4af37",

    "Sales Team Sales": "#d4af37",

    "Salah Balance": "#f59e0b",
    "Bahaa Balance": "#f59e0b",
    "Abdou Balance": "#f59e0b",
    "Sales Team Balance": "#f59e0b",
    "Total Sales Staff Balance": "#dc2626",

    "Salah Paid": "#22c55e",
    "Bahaa Paid": "#22c55e",
    "Abdou Paid": "#22c55e",
    "Sales Team Paid": "#22c55e",

    "Customer / Personal Sales":
      "#d4af37",

    "Customer / Personal Paid":
      "#22c55e",

    "Customer / Personal Balance":
      "#f59e0b",

    "Teyseer Paid":
      "#22c55e",

    "Teyseer Balance":
      "#dc2626",
  };

  const content = (
    <div
      style={{
        ...styles.card,

        borderTop:
          `4px solid ${
            colors[title] ||
            "#d4af37"
          }`,
        ...(onClick
          ? {
              cursor: "pointer",
              transition: "0.2s",
            }
          : {}),
      }}
      onClick={onClick}
    >
      <div style={styles.icon}>
        {icon}
      </div>

      <h3
        style={
          styles.cardTitle
        }
      >
        {title}
      </h3>

      <h2
        style={
          styles.cardValue
        }
      >
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
          textDecoration:
            "none",
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
}

// ==========================================
// STYLES
// ==========================================

const styles = {
  page: {
    minHeight: "100vh",
    padding: "30px",
    background: "#0b0b0b",
    color: "#f5f5f5",
    boxSizing: "border-box",
  },

  container: {
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "30px",
    flexWrap: "wrap",
  },

  title: {
    color: "#d4af37",
    fontSize: "30px",
    margin: 0,
  },

  subtitle: {
    color: "#999",
    marginTop: "8px",
  },

  headerActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  newButton: {
    background: "#d4af37",
    color: "#080808",
    border: "none",
    padding: "12px 22px",
    borderRadius: "10px",
    fontSize: "16px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  secondaryButton: {
    background: "#222",
    color: "#f5f5f5",
    border:
      "1px solid #555",
    padding:
      "12px 18px",
    borderRadius: "10px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  filterBox: {
    background: "#151515",
    border:
      "1px solid #3b321c",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "25px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
  },

  filterLabel: {
    color: "#d4af37",
    fontWeight: "bold",
  },

  select: {
    padding: "12px",
    borderRadius: "8px",
    border:
      "1px solid #555",
    background: "#222",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },

  cards: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(220px,1fr))",
    gap: "18px",
    marginBottom: "40px",
  },

  card: {
    background: "#151515",
    padding: "22px",
    borderRadius: "12px",
    textAlign: "center",
    border:
      "1px solid #3b321c",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)",
    color: "#f5f5f5",
    minHeight: "150px",
    boxSizing: "border-box",
  },

  icon: {
    fontSize: "34px",
    marginBottom: "8px",
  },

  cardTitle: {
    color: "#aaa",
    margin:
      "5px 0 10px",
  },

  cardValue: {
    color: "#d4af37",
    margin: 0,
    fontSize: "24px",
  },

  heading: {
    color: "#d4af37",
    marginTop: "35px",
    marginBottom: "18px",
  },

  tableBox: {
    background: "#151515",
    border:
      "1px solid #3b321c",
    borderRadius: "12px",
    padding: "20px",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)",
    marginBottom: "40px",
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse:
      "collapse",
    textAlign: "left",
  },

  th: {
    color: "#d4af37",
    padding: "14px",
    borderBottom:
      "1px solid #3b321c",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px",
    borderBottom:
      "1px solid #292929",
    color: "#eee",
    whiteSpace: "nowrap",
  },

  status: {
    background: "#3b321c",
    color: "#d4af37",
    padding:
      "6px 12px",
    borderRadius: "20px",
    fontSize: "14px",
  },

  charts: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(300px,1fr))",
    gap: "20px",
    marginBottom: "40px",
  },

  chartBox: {
    background: "#151515",
    border:
      "1px solid #3b321c",
    padding: "20px",
    borderRadius: "12px",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)",
  },

  chartTitle: {
    color: "#d4af37",
  },

  tooltip: {
    background: "#151515",
    border:
      "1px solid #d4af37",
    color: "#fff",
  },

  recent: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",
    gap: "20px",
    marginBottom: "40px",
  },

  recentCard: {
    background: "#151515",
    padding: "20px",
    borderRadius: "12px",
    border:
      "1px solid #3b321c",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)",
  },

  goldText: {
    color: "#d4af37",
  },

  bigNumber: {
    color: "#fff",
    fontSize: "32px",
    marginBottom: "0",
  },

  muted: {
    color: "#888",
  },

  actions: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: "20px",
    paddingBottom: "40px",
  },

  actionCard: {
    background: "#151515",
    padding: "25px",
    borderRadius: "12px",
    textDecoration: "none",
    color: "#f5f5f5",
    textAlign: "center",
    border:
      "1px solid #3b321c",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)",
    display: "block",
    transition: "0.2s",
  },

  actionIcon: {
    fontSize: "32px",
    marginBottom: "8px",
  },

  paidTd: {
    padding: "14px",
    borderBottom: "1px solid #292929",
    color: "#22c55e",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  balanceTd: {
    padding: "14px",
    borderBottom: "1px solid #292929",
    color: "#f59e0b",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  totalTd: {
    padding: "14px",
    borderTop: "2px solid #d4af37",
    color: "#d4af37",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  totalPaidTd: {
    padding: "14px",
    borderTop: "2px solid #d4af37",
    color: "#22c55e",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  totalBalanceTd: {
    padding: "14px",
    borderTop: "2px solid #d4af37",
    color: "#dc2626",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.78)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 9999,
    boxSizing: "border-box",
  },

  modal: {
    width: "100%",
    maxWidth: "1250px",
    maxHeight: "90vh",
    overflow: "auto",
    background: "#111",
    border: "1px solid #3b321c",
    borderRadius: "14px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    padding: "24px",
    boxSizing: "border-box",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "20px",
  },

  modalTitle: {
    margin: 0,
    color: "#d4af37",
    fontSize: "24px",
  },

  modalSubtitle: {
    margin: "8px 0 0",
    color: "#999",
  },

  modalCloseButton: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    border: "1px solid #444",
    background: "#1b1b1b",
    color: "#fff",
    fontSize: "28px",
    cursor: "pointer",
    lineHeight: 1,
  },

  modalSummaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: "14px",
    marginBottom: "18px",
  },

  modalSummaryCard: {
    background: "#171717",
    border: "1px solid #292929",
    borderRadius: "10px",
    padding: "16px",
  },

  modalSummaryLabel: {
    display: "block",
    color: "#999",
    fontSize: "13px",
    marginBottom: "6px",
  },

  modalSummaryValue: {
    color: "#f5f5f5",
    fontSize: "22px",
  },

  modalBalanceValue: {
    color: "#f59e0b",
    fontSize: "22px",
  },

  modalSearch: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid #3b321c",
    background: "#0b0b0b",
    color: "#fff",
    outline: "none",
    marginBottom: "18px",
    fontSize: "14px",
  },

  modalTableWrap: {
    overflowX: "auto",
    border: "1px solid #292929",
    borderRadius: "10px",
  },

  empty: {
    color: "#888",
    textAlign: "center",
    padding: "20px",
  },
};

export default Dashboard;