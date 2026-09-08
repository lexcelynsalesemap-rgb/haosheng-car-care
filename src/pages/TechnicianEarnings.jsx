import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

function TechnicianEarnings() {
  const [earnings, setEarnings] = useState([]);
  const [staffFilter, setStaffFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("");

  async function loadData() {
    const { data, error } = await supabase
      .from("service_technicians")
      .select(`
        commission,
        technicians(
          name
        ),
        job_services(
          service_name,
          jobs(
            carModel,
            plate,
            created_at
          )
        )
      `);

    if (error) {
      console.log(error);
      return;
    }

    setEarnings(data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  // GET STAFF NAMES
  const staffNames = [
    ...new Set(
      earnings
        .map((row) => row.technicians?.name)
        .filter(Boolean)
    ),
  ];

  // FILTER DATA
  const filteredEarnings = earnings.filter((row) => {
    const staffName = row.technicians?.name || "Unknown";
    const job = row.job_services?.jobs;

    // STAFF FILTER
    const staffMatch =
      staffFilter === "All" || staffName === staffFilter;

    // MONTH FILTER
    let monthMatch = true;

    if (monthFilter && job?.created_at) {
      const jobDate = new Date(job.created_at);

      const jobYear = jobDate.getFullYear();
      const jobMonth = String(jobDate.getMonth() + 1).padStart(2, "0");

      const jobMonthValue = `${jobYear}-${jobMonth}`;

      monthMatch = jobMonthValue === monthFilter;
    }

    return staffMatch && monthMatch;
  });

  // TOTAL COMMISSION
  const totalCommission = filteredEarnings.reduce(
    (total, row) => total + Number(row.commission || 0),
    0
  );

  // PRINT
  function printReport() {
    window.print();
  }

  return (
    <div style={styles.page}>

      {/* SCREEN HEADER */}
      <div style={styles.header} className="no-print">

        <div>
          <h1 style={styles.title}>
            Technician Earnings
          </h1>

          <p style={styles.subtitle}>
            Staff commission report
          </p>
        </div>

        <button
          onClick={printReport}
          style={styles.printButton}
        >
          Print Report
        </button>

      </div>

      {/* FILTERS */}
      <div style={styles.filterCard} className="no-print">

        <div style={styles.filterGroup}>

          <label style={styles.label}>
            Staff
          </label>

          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            style={styles.select}
          >
            <option value="All">
              All Staff
            </option>

            {staffNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

        </div>

        <div style={styles.filterGroup}>

          <label style={styles.label}>
            Month
          </label>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            style={styles.select}
          />

        </div>

        <button
          onClick={() => {
            setStaffFilter("All");
            setMonthFilter("");
          }}
          style={styles.clearButton}
        >
          Clear Filters
        </button>

      </div>

      {/* PRINT HEADER */}
      <div style={styles.printHeader}>

        <h1>
          Staff Earnings Report
        </h1>

        <p>
          Staff:{" "}
          <strong>
            {staffFilter}
          </strong>
        </p>

        <p>
          Month:{" "}
          <strong>
            {monthFilter
              ? new Date(
                  monthFilter + "-01"
                ).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
              : "All Months"}
          </strong>
        </p>

      </div>

      {/* TOTAL */}
      <div style={styles.totalCard}>

        <div>

          <div style={styles.totalTitle}>
            Total Services
          </div>

          <div style={styles.totalNumber}>
            {filteredEarnings.length}
          </div>

        </div>

        <div>

          <div style={styles.totalTitle}>
            Total Commission
          </div>

          <div style={styles.totalAmount}>
            QAR {totalCommission.toFixed(2)}
          </div>

        </div>

      </div>

      {/* REPORT */}
      <div style={styles.card}>

        <h2 style={styles.heading}>
          Earnings Report
        </h2>

        <table style={styles.table}>

          <thead>

            <tr>

              <th style={styles.th}>
                Date
              </th>

              <th style={styles.th}>
                Car Model
              </th>

              <th style={styles.th}>
                Plate
              </th>

              <th style={styles.th}>
                Service
              </th>

              <th style={styles.th}>
                Technician
              </th>

              <th style={styles.th}>
                Commission
              </th>

            </tr>

          </thead>

          <tbody>

            {filteredEarnings.length === 0 ? (

              <tr>

                <td
                  colSpan="6"
                  style={styles.empty}
                >
                  No earnings found for the selected filters.
                </td>

              </tr>

            ) : (

              filteredEarnings.map((row, index) => {

                const job = row.job_services?.jobs;

                return (

                  <tr key={index}>

                    <td style={styles.td}>
                      {job?.created_at
                        ? new Date(
                            job.created_at
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    <td style={styles.td}>
                      {job?.carModel || "-"}
                    </td>

                    <td style={styles.td}>
                      {job?.plate || "-"}
                    </td>

                    <td style={styles.td}>
                      {row.job_services?.service_name || "-"}
                    </td>

                    <td style={styles.td}>
                      {row.technicians?.name || "Unknown"}
                    </td>

                    <td style={styles.commission}>
                      QAR{" "}
                      {Number(
                        row.commission || 0
                      ).toFixed(2)}
                    </td>

                  </tr>

                );

              })

            )}

          </tbody>

        </table>

      </div>

      <style>
        {`
          @media print {

            body {
              background: white !important;
            }

            .no-print {
              display: none !important;
            }

            @page {
              margin: 15mm;
            }

            table {
              page-break-inside: auto;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }

            .printHeader {
              display: block !important;
            }
          }

          .printHeader {
            display: none;
          }
        `}
      </style>

    </div>
  );
}

const styles = {
  page: {
    padding: "30px",
    background: "var(--bg)",
    minHeight: "100vh",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  title: {
    margin: 0,
  },

  subtitle: {
    color: "#777",
    marginTop: "5px",
  },

  printButton: {
    background: "#111827",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  filterCard: {
    background: "white",
    padding: "20px",
    borderRadius: "15px",
    marginBottom: "20px",
    display: "flex",
    gap: "20px",
    alignItems: "end",
    flexWrap: "wrap",
  },

  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#555",
  },

  select: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "white",
    minWidth: "180px",
    fontSize: "14px",
  },

  clearButton: {
    padding: "10px 15px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#f3f4f6",
    cursor: "pointer",
  },

  printHeader: {
    marginBottom: "20px",
  },

  totalCard: {
    background: "white",
    padding: "20px 25px",
    borderRadius: "15px",
    marginBottom: "20px",
    display: "flex",
    gap: "60px",
  },

  totalTitle: {
    fontSize: "14px",
    color: "#777",
    marginBottom: "5px",
  },

  totalNumber: {
    fontSize: "24px",
    fontWeight: "700",
  },

  totalAmount: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#16a34a",
  },

  card: {
    background: "white",
    padding: "25px",
    borderRadius: "15px",
    overflowX: "auto",
  },

  heading: {
    marginTop: 0,
    marginBottom: "20px",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "14px",
    borderBottom: "2px solid #eee",
    fontSize: "14px",
    color: "#555",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px",
    borderBottom: "1px solid #eee",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },

  commission: {
    padding: "14px",
    borderBottom: "1px solid #eee",
    fontSize: "14px",
    fontWeight: "700",
    color: "#16a34a",
    whiteSpace: "nowrap",
  },

  empty: {
    textAlign: "center",
    padding: "40px",
    color: "#777",
  },
};

export default TechnicianEarnings;