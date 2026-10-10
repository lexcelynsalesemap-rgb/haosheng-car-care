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

const SHOP_THEMES = {
  1: {
    name: "Haosheng Car Care",
    primary: "#d4af37",
    accent: "#f59e0b",
    border: "#3b321c",
    card: "#151515",
    background: "#0b0b0b",
  },

  2: {
    name: "New Car Shop",
    primary: "#2563eb",
    accent: "#06b6d4",
    border: "#1e3a5f",
    card: "#111827",
    background: "#0f172a",
  },
};

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dateFilter, setDateFilter] = useState("All");
  const [selectedSalesStaff, setSelectedSalesStaff] = useState(null);
  const [staffCustomerSearch, setStaffCustomerSearch] = useState("");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const isAdmin =
    String(user?.role || "")
      .trim()
      .toLowerCase() === "admin";

  const shopId = Number(user?.shop_id || 1);

  const theme =
    SHOP_THEMES[shopId] || SHOP_THEMES[1];

  const styles = getStyles(theme);

  useEffect(() => {
    loadDashboard();

    const jobsChannel = supabase
      .channel(`dashboard-jobs-${shopId}`)
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
      .channel(`dashboard-payments-${shopId}`)
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
  }, [shopId]);

  async function loadDashboard() {
    await Promise.all([
      loadJobs(),
      loadPayments(),
    ]);
  }

  async function loadJobs() {
    const currentUser = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    const currentShopId = Number(
      currentUser?.shop_id || 0
    );

    if (!currentShopId) {
      console.error("NO SHOP ID FOUND");
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("jobs")
      .select("*")
      .eq("shop_id", currentShopId)
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
    const currentUser = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    const currentShopId = Number(
      currentUser?.shop_id || 0
    );

    if (!currentShopId) {
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
      .eq("jobs.shop_id", currentShopId);

    if (error) {
      console.error(
        "LOAD PAYMENTS ERROR:",
        error
      );
      return;
    }

    setPayments(data || []);
  }

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

  

  function isWttService(serviceName) {
    return String(serviceName || "")
      .toLowerCase()
      .includes("wtt");
  }

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

    if (shopId === 2) {
      const gross = services.reduce(
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

      return {
        gross,
        teyseer: 0,
        salah: 0,
        bahaa: 0,
        salesTeam: 0,
        customerSales: gross,
      };
    }

    const source =
      normalizeSource(job?.source);

    let gross = 0;
    let teyseer = 0;
    let salah = 0;
    let bahaa = 0;
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

      if (
        isPureTeyseerSource(source)
      ) {
        teyseer += amount;
        return;
      }

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

      if (source === "salah") {
        salah += amount;
        return;
      }

      if (source === "bahaa") {
        bahaa += amount;
        return;
      }

           salesTeam += amount;
    });

    const customerSales =
      salah +
      bahaa +
      salesTeam;

    return {
      gross,
      teyseer,
      salah,
      bahaa,
      salesTeam,
      customerSales,
    };
  }

  const filteredJobs = jobs.filter((job) => {
    if (dateFilter === "All") {
      return true;
    }

    if (!job.created_at) {
      return false;
    }

    const jobDate = new Date(
      job.created_at
    );

    const now = new Date();

    if (isNaN(jobDate.getTime())) {
      return false;
    }

    if (dateFilter === "Today") {
      return (
        jobDate.getDate() === now.getDate() &&
        jobDate.getMonth() === now.getMonth() &&
        jobDate.getFullYear() === now.getFullYear()
      );
    }

    if (dateFilter === "Year") {
      return (
        jobDate.getFullYear() ===
        now.getFullYear()
      );
    }

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const selectedMonth =
      monthNames.indexOf(dateFilter);

    if (selectedMonth !== -1) {
      return (
        jobDate.getMonth() ===
          selectedMonth &&
        jobDate.getFullYear() ===
          now.getFullYear()
      );
    }

    return true;
  });

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

  let teyseerSales = 0;
  let salahSales = 0;
  let bahaaSales = 0;
  let salesTeamSales = 0;

  let rawGrossSales = 0;

  filteredJobs.forEach((job) => {
    const breakdown =
      getJobSalesBreakdown(job);

    rawGrossSales +=
      breakdown.gross;

    if (shopId === 2) {
      return;
    }

    teyseerSales +=
      breakdown.teyseer;

    salahSales +=
      breakdown.salah;

    bahaaSales +=
      breakdown.bahaa;

    salesTeamSales +=
      breakdown.salesTeam;
  });

  let customerSales = 0;

  if (shopId === 2) {
    customerSales =
      rawGrossSales;
  } else {
    customerSales =
      salahSales +
      bahaaSales +
      salesTeamSales;
  }

  const totalSales =
    shopId === 2
      ? customerSales
      : teyseerSales +
        customerSales;

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

  let salahPaid = 0;
  let bahaaPaid = 0;
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

      const paymentAmount =
        Number(
          payment.amount || 0
        );

      if (paymentAmount <= 0) {
        return;
      }

      if (shopId === 2) {
        customerPaid +=
          paymentAmount;

        return;
      }

      const breakdown =
        getJobSalesBreakdown(job);

      if (
        breakdown.teyseer > 0 &&
        breakdown.customerSales <= 0
      ) {
        teyseerPaid +=
          paymentAmount;

        return;
      }

      if (
        breakdown.customerSales > 0
      ) {
        customerPaid +=
          paymentAmount;

        const customerBase =
          breakdown.customerSales;

        if (breakdown.salah > 0) {
          salahPaid +=
            paymentAmount *
            (breakdown.salah /
              customerBase);
        }

        if (breakdown.bahaa > 0) {
          bahaaPaid +=
            paymentAmount *
            (breakdown.bahaa /
              customerBase);
        }

        if (
          breakdown.salesTeam > 0
        ) {
          salesTeamPaid +=
            paymentAmount *
            (breakdown.salesTeam /
              customerBase);
        }
      }
    }
  );

  const salahBalance =
    Math.max(
      salahSales -
        salahPaid,
      0
    );

  const bahaaBalance =
    Math.max(
      bahaaSales -
        bahaaPaid,
      0
    );
  const salesTeamBalance =
    Math.max(
      salesTeamSales -
        salesTeamPaid,
      0
    );

  const salesStaffBalanceTotal =
    salahBalance +
    bahaaBalance +
    salesTeamBalance;

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

  const paymentByJobId = {};

  filteredPayments.forEach(
    (payment) => {
      const amount =
        Number(
          payment.amount || 0
        );

      if (amount > 0) {
        paymentByJobId[
          payment.job_id
        ] =
          (paymentByJobId[
            payment.job_id
          ] || 0) + amount;
      }
    }
  );

  const salesStaffCustomerRows = {
    Salah: [],
    Bahaa: [],
    "Sales Team": [],
  };

  const staffKeys = {
    Salah: "salah",
    Bahaa: "bahaa",
    "Sales Team": "salesTeam",
  };

  filteredJobs.forEach((job) => {
    const breakdown =
      getJobSalesBreakdown(job);

    const jobPaymentTotal =
      paymentByJobId[job.id] || 0;

    const customerSidePaid =
      Math.min(
        Math.max(
          jobPaymentTotal,
          0
        ),
        Math.max(
          breakdown.customerSales,
          0
        )
      );

    Object.entries(
      staffKeys
    ).forEach(
      ([staffName, staffKey]) => {
        const staffSales =
          Number(
            breakdown[staffKey] || 0
          );

        if (staffSales <= 0) {
          return;
        }

        const staffPaid =
          breakdown.customerSales >
          0
            ? customerSidePaid *
              (staffSales /
                breakdown.customerSales)
            : 0;

        const staffBalance =
          Math.max(
            staffSales -
              staffPaid,
            0
          );

        if (staffBalance <= 0) {
          return;
        }

        salesStaffCustomerRows[
          staffName
        ].push({
          job,
          sales: staffSales,
          paid: staffPaid,
          balance: staffBalance,
        });
      }
    );
  });

  const selectedStaffRows =
    selectedSalesStaff
      ? salesStaffCustomerRows[
          selectedSalesStaff
        ] || []
      : [];

  const normalizedStaffSearch =
    staffCustomerSearch
      .trim()
      .toLowerCase();

  const visibleStaffRows =
    selectedStaffRows.filter(
      (row) => {
        if (!normalizedStaffSearch) {
          return true;
        }

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

        return searchable.includes(
          normalizedStaffSearch
        );
      }
    );

  let sourceReport;

  if (shopId === 2) {
    sourceReport = {
      "Customer Sales": {
        jobs: 0,
        sales: 0,
      },
    };

    filteredJobs.forEach((job) => {
      const gross =
        getJobSalesBreakdown(
          job
        ).gross;

      if (gross > 0) {
        sourceReport[
          "Customer Sales"
        ].jobs += 1;

        sourceReport[
          "Customer Sales"
        ].sales += gross;
      }
    });
  } else {
    sourceReport = {
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

      "Sales Team": {
        jobs: 0,
        sales: 0,
      },
    };

    filteredJobs.forEach((job) => {
      const services =
        Array.isArray(
          job.services
        )
          ? job.services
          : [];

      const serviceDetails =
        job.serviceDetails &&
        typeof job.serviceDetails ===
          "object"
          ? job.serviceDetails
          : {};

      const source =
        normalizeSource(
          job.source
        );

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

          if (
            isPureTeyseerSource(
              source
            )
          ) {
            reportSource =
              "Teyseer Motors";
          } else if (
            isTeyseerSalahSource(
              source
            )
          ) {
            reportSource =
              isWtt
                ? "Teyseer Motors"
                : "Salah";
          } else if (
            isTeyseerBahaaSource(
              source
            )
          ) {
            reportSource =
              isWtt
                ? "Teyseer Motors"
                : "Bahaa";
          } else if (
            source === "salah"
          ) {
            reportSource =
              "Salah";
          } else if (
            source === "bahaa"
          ) {
            reportSource =
              "Bahaa";
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
  }

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

  const salesData =
    shopId === 2
      ? [
          {
            name: "Customer Sales",
            amount: customerSales,
          },
        ]
      : [
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

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              🚗 {theme.name}
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

            <option value="January">
              January
            </option>

            <option value="February">
              February
            </option>

            <option value="March">
              March
            </option>

            <option value="April">
              April
            </option>

            <option value="May">
              May
            </option>

            <option value="June">
              June
            </option>

            <option value="July">
              July
            </option>

            <option value="August">
              August
            </option>

            <option value="September">
              September
            </option>

            <option value="October">
              October
            </option>

            <option value="November">
              November
            </option>

            <option value="December">
              December
            </option>

            <option value="Year">
              This Year
            </option>
          </select>
        </div>

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

          {shopId === 1 && (
            <Card
              title="Teyseer Sales"
              value={`QAR ${money(
                teyseerSales
              )}`}
              icon="🏢"
            />
          )}

          {shopId === 1 && (
            <>
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
                title="Sales Team Sales"
                value={`QAR ${money(
                  salesTeamSales
                )}`}
                icon="💵"
              />
            </>
          )}

          {shopId === 1 && (
            <>
              <Card
                title="Salah Balance"
                value={`QAR ${money(
                  salahBalance
                )}`}
                icon="⚠️"
                onClick={() => {
                  setSelectedSalesStaff(
                    "Salah"
                  );
                  setStaffCustomerSearch(
                    ""
                  );
                }}
              />

              <Card
                title="Bahaa Balance"
                value={`QAR ${money(
                  bahaaBalance
                )}`}
                icon="⚠️"
                onClick={() => {
                  setSelectedSalesStaff(
                    "Bahaa"
                  );
                  setStaffCustomerSearch(
                    ""
                  );
                }}
              />

              <Card
                title="Sales Team Balance"
                value={`QAR ${money(
                  salesTeamBalance
                )}`}
                icon="⚠️"
                onClick={() => {
                  setSelectedSalesStaff(
                    "Sales Team"
                  );
                  setStaffCustomerSearch(
                    ""
                  );
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
                title="Sales Team Paid"
                value={`QAR ${money(
                  salesTeamPaid
                )}`}
                icon="💳"
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
            </>
          )}

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
        </div>

        {shopId === 1 && (
          <>
            <h2 style={styles.heading}>
              Individual Sales Staff Balances
            </h2>

            <div style={styles.tableBox}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>
                      Sales Staff
                    </th>

                    <th style={styles.th}>
                      Sales
                    </th>

                    <th style={styles.th}>
                      Paid
                    </th>

                    <th style={styles.th}>
                      Balance
                    </th>

                    <th style={styles.th}>
                      Collection %
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {[
                    {
                      name: "Salah",
                      sales: salahSales,
                      paid: salahPaid,
                      balance:
                        salahBalance,
                    },
                    {
                      name: "Bahaa",
                      sales: bahaaSales,
                      paid: bahaaPaid,
                      balance:
                        bahaaBalance,
                    },
                    {
                      name: "Sales Team",
                      sales:
                        salesTeamSales,
                      paid:
                        salesTeamPaid,
                      balance:
                        salesTeamBalance,
                    },
                  ].map(
                    (staff) => {
                      const collection =
                        staff.sales > 0
                          ? Math.min(
                              (staff.paid /
                                staff.sales) *
                                100,
                              100
                            )
                          : 0;

                      return (
                        <tr
                          key={
                            staff.name
                          }
                        >
                          <td
                            style={{
                              ...styles.td,
                              fontWeight:
                                "bold",
                            }}
                          >
                            {staff.name}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            QAR{" "}
                            {money(
                              staff.sales
                            )}
                          </td>

                          <td
                            style={
                              styles.paidTd
                            }
                          >
                            QAR{" "}
                            {money(
                              staff.paid
                            )}
                          </td>

                          <td
                            style={
                              styles.balanceTd
                            }
                          >
                            QAR{" "}
                            {money(
                              staff.balance
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {collection.toFixed(
                              1
                            )}
                            %
                          </td>
                        </tr>
                      );
                    }
                  )}

                  <tr>
                    <td
                      style={
                        styles.totalTd
                      }
                    >
                      TOTAL
                    </td>

                    <td
                      style={
                        styles.totalTd
                      }
                    >
                      QAR{" "}
                      {money(
                        customerSales
                      )}
                    </td>

                    <td
                      style={
                        styles.totalPaidTd
                      }
                    >
                      QAR{" "}
                      {money(
                        customerPaid
                      )}
                    </td>

                    <td
                      style={
                        styles.totalBalanceTd
                      }
                    >
                      QAR{" "}
                      {money(
                        salesStaffBalanceTotal
                      )}
                    </td>

                    <td
                      style={
                        styles.totalTd
                      }
                    >
                      {customerSales >
                      0
                        ? Math.min(
                            (customerPaid /
                              customerSales) *
                              100,
                            100
                          ).toFixed(
                            1
                          )
                        : "0.0"}
                      %
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

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

                {shopId === 1 && (
                  <>
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
                      Sales Team
                    </th>
                  </>
                )}

                {shopId === 2 && (
                  <th style={styles.th}>
                    Customer Sales
                  </th>
                )}
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
                      <td
                        style={styles.td}
                      >
                        {job.customer ||
                          "Unknown"}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {job.carModel ||
                          job.vehicle ||
                          "-"}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {job.source ||
                          "-"}
                      </td>

                      <td
                        style={styles.td}
                      >
                        <span
                          style={
                            styles.status
                          }
                        >
                          {job.status ||
                            "New"}
                        </span>
                      </td>

                      <td
                        style={styles.td}
                      >
                        QAR{" "}
                        {money(
                          breakdown.gross
                        )}
                      </td>

                      {shopId === 1 && (
                        <>
                          <td
                            style={
                              styles.td
                            }
                          >
                            QAR{" "}
                            {money(
                              breakdown.teyseer
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            QAR{" "}
                            {money(
                              breakdown.salah
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            QAR{" "}
                            {money(
                              breakdown.bahaa
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            QAR{" "}
                            {money(
                              breakdown.salesTeam
                            )}
                          </td>
                        </>
                      )}

                      {shopId === 2 && (
                        <td
                          style={
                            styles.td
                          }
                        >
                          QAR{" "}
                          {money(
                            breakdown.customerSales
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {filteredJobs.length ===
            0 && (
            <p
              style={
                styles.empty
              }
            >
              No jobs found for this
              period.
            </p>
          )}
        </div>

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
                          COLORS[
                            index
                          ]
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
                  fill={
                    theme.primary
                  }
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
              style={
                styles.actionCard
              }
            >
              <div
                style={
                  styles.actionIcon
                }
              >
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

        {selectedSalesStaff && (
          <div
            style={
              styles.modalOverlay
            }
            onClick={() =>
              setSelectedSalesStaff(
                null
              )
            }
          >
            <div
              style={styles.modal}
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div
                style={
                  styles.modalHeader
                }
              >
                <div>
                  <h2
                    style={
                      styles.modalTitle
                    }
                  >
                    {selectedSalesStaff} —
                    Outstanding Customers
                  </h2>

                  <p
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Customers/jobs with an
                    unpaid balance assigned
                    to{" "}
                    {selectedSalesStaff}.
                  </p>
                </div>

                <button
                  type="button"
                  style={
                    styles.modalCloseButton
                  }
                  onClick={() =>
                    setSelectedSalesStaff(
                      null
                    )
                  }
                >
                  ×
                </button>
              </div>

              <div
                style={
                  styles.modalSummaryRow
                }
              >
                <div
                  style={
                    styles.modalSummaryCard
                  }
                >
                  <span
                    style={
                      styles.modalSummaryLabel
                    }
                  >
                    Customers / Jobs
                  </span>

                  <strong
                    style={
                      styles.modalSummaryValue
                    }
                  >
                    {
                      selectedStaffRows.length
                    }
                  </strong>
                </div>

                <div
                  style={
                    styles.modalSummaryCard
                  }
                >
                  <span
                    style={
                      styles.modalSummaryLabel
                    }
                  >
                    Outstanding Balance
                  </span>

                  <strong
                    style={
                      styles.modalBalanceValue
                    }
                  >
                    QAR{" "}
                    {money(
                      selectedStaffRows.reduce(
                        (
                          sum,
                          row
                        ) =>
                          sum +
                          row.balance,
                        0
                      )
                    )}
                  </strong>
                </div>
              </div>

              <input
                type="text"
                value={
                  staffCustomerSearch
                }
                onChange={(event) =>
                  setStaffCustomerSearch(
                    event.target.value
                  )
                }
                placeholder="Search customer, vehicle, plate, source, or job ID..."
                style={
                  styles.modalSearch
                }
              />

              <div
                style={
                  styles.modalTableWrap
                }
              >
                <table
                  style={styles.table}
                >
                  <thead>
                    <tr>
                      <th
                        style={
                          styles.th
                        }
                      >
                        Customer
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Vehicle
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Source
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Date
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Sales
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Paid
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Balance
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleStaffRows.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan="7"
                          style={
                            styles.empty
                          }
                        >
                          {selectedStaffRows.length ===
                          0
                            ? "No outstanding customers for this sales staff."
                            : "No customers match your search."}
                        </td>
                      </tr>
                    ) : (
                      visibleStaffRows.map(
                        (row) => {
                          const job =
                            row.job;

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
                            <tr
                              key={`${selectedSalesStaff}-${job.id}`}
                            >
                              <td
                                style={{
                                  ...styles.td,
                                  fontWeight:
                                    "bold",
                                }}
                              >
                                {job.customer ||
                                  "Walk-in Customer"}
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                {vehicle}
                                {plate
                                  ? ` • ${plate}`
                                  : ""}
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                {job.source ||
                                  "-"}
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                {job.created_at
                                  ? new Date(
                                      job.created_at
                                    ).toLocaleDateString()
                                  : "-"}
                              </td>

                              <td
                                style={
                                  styles.td
                                }
                              >
                                QAR{" "}
                                {money(
                                  row.sales
                                )}
                              </td>

                              <td
                                style={
                                  styles.paidTd
                                }
                              >
                                QAR{" "}
                                {money(
                                  row.paid
                                )}
                              </td>

                              <td
                                style={
                                  styles.balanceTd
                                }
                              >
                                QAR{" "}
                                {money(
                                  row.balance
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )
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

function Card({
  title,
  value,
  status,
  icon,
  onClick,
}) {
  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const shopId = Number(
    user?.shop_id || 1
  );

  const theme =
    SHOP_THEMES[shopId] ||
    SHOP_THEMES[1];

  const cardStyles =
    getStyles(theme);

  const colors = {
    "Total Jobs": theme.primary,
    New: theme.primary,
    "In Progress": theme.accent,
    Finished: "#22c55e",
    Delivered: "#0891b2",

    "Total Sales": theme.primary,

    "Teyseer Sales":
      theme.primary,

    "Salah Sales":
      theme.primary,

    "Bahaa Sales":
      theme.primary,

    "Sales Team Sales":
      theme.primary,

    "Salah Balance":
      theme.accent,

    "Bahaa Balance":
      theme.accent,

    "Sales Team Balance":
      theme.accent,

    "Total Sales Staff Balance":
      "#dc2626",

    "Salah Paid":
      "#22c55e",

    "Bahaa Paid":
      "#22c55e",

    "Sales Team Paid":
      "#22c55e",

    "Customer / Personal Sales":
      theme.primary,

    "Customer / Personal Paid":
      "#22c55e",

    "Customer / Personal Balance":
      theme.accent,

    "Teyseer Paid":
      "#22c55e",

    "Teyseer Balance":
      "#dc2626",
  };

  const content = (
    <div
      style={{
        ...cardStyles.card,
        borderTop: `4px solid ${
          colors[title] ||
          theme.primary
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
      <div
        style={
          cardStyles.icon
        }
      >
        {icon}
      </div>

      <h3
        style={
          cardStyles.cardTitle
        }
      >
        {title}
      </h3>

      <h2
        style={
          cardStyles.cardValue
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
          textDecoration: "none",
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
}

const getStyles = (theme) => ({
  page: {
    minHeight: "100vh",
    padding: "30px",
    background: theme.background,
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
    fontSize: "28px",
    fontWeight: "700",
    color: theme.primary,
    marginBottom: "25px",
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
    background: theme.primary,
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
      `1px solid ${theme.border}`,
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "25px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
  },

  filterLabel: {
    color: theme.primary,
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
    background: theme.card,
    padding: "22px",
    borderRadius: "12px",
    textAlign: "center",
    border:
      `1px solid ${theme.border}`,
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
    color: theme.primary,
    margin: 0,
    fontSize: "24px",
  },

  heading: {
    color: theme.primary,
    marginTop: "35px",
    marginBottom: "18px",
  },

  tableBox: {
    background: "#151515",
    border:
      `1px solid ${theme.border}`,
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
    color: theme.primary,
    padding: "14px",
    borderBottom:
      `1px solid ${theme.border}`,
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
    background: theme.border,
    color: theme.primary,
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
      `1px solid ${theme.border}`,
    padding: "20px",
    borderRadius: "12px",
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)",
  },

  chartTitle: {
    color: theme.primary,
  },

  tooltip: {
    background: "#151515",
    border:
      `1px solid ${theme.primary}`,
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
      `1px solid ${theme.border}`,
    boxShadow:
      "0 8px 20px rgba(0,0,0,0.35)",
  },

  goldText: {
    color: theme.primary,
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
      `1px solid ${theme.border}`,
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
    borderBottom:
      "1px solid #292929",
    color: "#22c55e",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  balanceTd: {
    padding: "14px",
    borderBottom:
      "1px solid #292929",
    color: "#f59e0b",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  totalTd: {
    padding: "14px",
    borderTop:
      `2px solid ${theme.primary}`,
    color: theme.primary,
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  totalPaidTd: {
    padding: "14px",
    borderTop:
      `2px solid ${theme.primary}`,
    color: "#22c55e",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  totalBalanceTd: {
    padding: "14px",
    borderTop:
      `2px solid ${theme.primary}`,
    color: "#dc2626",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(0,0,0,0.78)",
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
    border:
      `1px solid ${theme.border}`,
    borderRadius: "14px",
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.6)",
    padding: "24px",
    boxSizing: "border-box",
  },

  modalHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "20px",
  },

  modalTitle: {
    margin: 0,
    color: theme.primary,
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
    border:
      "1px solid #444",
    background: "#1b1b1b",
    color: "#fff",
    fontSize: "28px",
    cursor: "pointer",
    lineHeight: 1,
  },

  modalSummaryRow: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(200px,1fr))",
    gap: "14px",
    marginBottom: "18px",
  },

  modalSummaryCard: {
    background: "#171717",
    border:
      "1px solid #292929",
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
    border:
      `1px solid ${theme.border}`,
    background: "#0b0b0b",
    color: "#fff",
    outline: "none",
    marginBottom: "18px",
    fontSize: "14px",
  },

  modalTableWrap: {
    overflowX: "auto",
    border:
      "1px solid #292929",
    borderRadius: "10px",
  },

  empty: {
    color: "#888",
    textAlign: "center",
    padding: "20px",
  },
});

export default Dashboard;