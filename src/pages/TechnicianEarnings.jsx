import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

function TechnicianEarnings() {
  const [earnings, setEarnings] = useState([]);
  const [staffFilter, setStaffFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("");
  const [saving, setSaving] = useState(null);

  async function loadData() {
    const { data, error } = await supabase
      .from("service_technicians")
      .select(`
        id,
        commission,
        remarks,
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

  const staffNames = [
    ...new Set(
      earnings
        .map((row) => row.technicians?.name)
        .filter(Boolean)
    ),
  ];

  const filteredEarnings = earnings.filter((row) => {
    const staffName = row.technicians?.name || "Unknown";
    const job = row.job_services?.jobs;

    const staffMatch =
      staffFilter === "All" || staffName === staffFilter;

    let monthMatch = true;

    if (monthFilter && job?.created_at) {
      const jobDate = new Date(job.created_at);

      const jobYear = jobDate.getFullYear();
      const jobMonth = String(jobDate.getMonth() + 1).padStart(
        2,
        "0"
      );

      const jobMonthValue = `${jobYear}-${jobMonth}`;

      monthMatch = jobMonthValue === monthFilter;
    }

    return staffMatch && monthMatch;
  });

  const totalCommission = filteredEarnings.reduce(
    (total, row) => total + Number(row.commission || 0),
    0
  );

  async function saveRemarks(id, remarks) {
    setSaving(id);

    const { error } = await supabase
      .from("service_technicians")
      .update({
        remarks: remarks,
      })
      .eq("id", id);

    if (error) {
      console.log(error);
      alert("Could not save the remarks.");
    }

    setSaving(null);
  }

  function printReport() {
    window.print();
  }

  return (
    <div style={styles.page} className="earnings-page">

      {/* =========================
          SCREEN HEADER
      ========================== */}
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

      {/* =========================
          FILTERS
      ========================== */}
      <div
        style={styles.filterCard}
        className="no-print"
      >

        <div style={styles.filterGroup}>

          <label style={styles.label}>
            Staff
          </label>

          <select
            value={staffFilter}
            onChange={(e) =>
              setStaffFilter(e.target.value)
            }
            style={styles.select}
          >
            <option value="All">
              All Staff
            </option>

            {staffNames.map((name) => (
              <option
                key={name}
                value={name}
              >
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
            onChange={(e) =>
              setMonthFilter(e.target.value)
            }
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

      {/* =========================
          PRINT HEADER
      ========================== */}
      <div className="printHeader">

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
                  `${monthFilter}-01`
                ).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
              : "All Months"}
          </strong>
        </p>

      </div>

      {/* =========================
          TOTALS
      ========================== */}
      <div
        style={styles.totalCard}
        className="totalCard"
      >

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

      {/* =========================
          EARNINGS TABLE
      ========================== */}
      <div
        style={styles.card}
        className="print-card"
      >

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

              <th style={styles.th}>
                Remarks
              </th>

            </tr>

          </thead>

          <tbody>

            {filteredEarnings.length === 0 ? (

              <tr>

                <td
                  colSpan="7"
                  style={styles.empty}
                >
                  No earnings found for the selected
                  filters.
                </td>

              </tr>

            ) : (

              filteredEarnings.map((row) => {

                const job =
                  row.job_services?.jobs;

                return (

                  <tr key={row.id}>

                    {/* DATE */}
                    <td style={styles.td}>
                      {job?.created_at
                        ? new Date(
                            job.created_at
                          ).toLocaleDateString()
                        : "-"}
                    </td>

                    {/* CAR MODEL */}
                    <td style={styles.td}>
                      {job?.carModel || "-"}
                    </td>

                    {/* PLATE */}
                    <td style={styles.td}>
                      {job?.plate || "-"}
                    </td>

                    {/* SERVICE */}
                    <td style={styles.td}>
                      {row.job_services
                        ?.service_name || "-"}
                    </td>

                    {/* TECHNICIAN */}
                    <td style={styles.td}>
                      {row.technicians?.name ||
                        "Unknown"}
                    </td>

                    {/* COMMISSION */}
                    <td style={styles.commission}>
                      QAR{" "}
                      {Number(
                        row.commission || 0
                      ).toFixed(2)}
                    </td>

                    {/* REMARKS */}
                    <td style={styles.td}>

                      <div
                        style={styles.remarkContainer}
                      >

                        <input
                          type="text"
                          value={
                            row.remarks || ""
                          }
                          placeholder="Add remark..."
                          onChange={(e) => {

                            setEarnings(
                              (current) =>
                                current.map(
                                  (item) =>
                                    item.id ===
                                    row.id
                                      ? {
                                          ...item,
                                          remarks:
                                            e.target
                                              .value,
                                        }
                                      : item
                                )
                            );

                          }}
                          onBlur={(e) =>
                            saveRemarks(
                              row.id,
                              e.target.value
                            )
                          }
                          style={
                            styles.remarkInput
                          }
                        />

                        {saving === row.id && (
                          <span
                            style={
                              styles.saving
                            }
                          >
                            Saving...
                          </span>
                        )}

                      </div>

                    </td>

                  </tr>

                );

              })

            )}

          </tbody>

        </table>

      </div>

      {/* =========================
          PRINT CSS
      ========================== */}

      <style>
        {`

          /* =========================
             NORMAL SCREEN
          ========================== */

          .printHeader {
            display: none;
          }


          /* =========================
             PRINT
          ========================== */

          @media print {

            @page {
              size: landscape;
              margin: 5mm;
            }

            /* Remove browser/page spacing */
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            /* Remove React root spacing */
            #root {
              margin: 0 !important;
              padding: 0 !important;
            }

            /* Remove our normal page padding */
            .earnings-page {
              margin: 0 !important;
              padding: 0 !important;
              min-height: 0 !important;
              width: 100% !important;
              max-width: none !important;
              background: white !important;
            }

            /* Hide screen controls */
            .no-print {
              display: none !important;
            }

            /* =========================
               PRINT HEADER
            ========================== */

            .printHeader {
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
            }

            .printHeader h1 {
              margin: 0 0 2px 0 !important;
              padding: 0 !important;
              font-size: 18px !important;
              line-height: 1.2 !important;
            }

            .printHeader p {
              margin: 1px 0 !important;
              padding: 0 !important;
              font-size: 9px !important;
              line-height: 1.2 !important;
            }

            /* =========================
               TOTAL CARD
            ========================== */

            .totalCard {
              margin: 6px 0 !important;
              padding: 7px 10px !important;
              border-radius: 5px !important;
              box-shadow: none !important;
            }

            /* =========================
               REPORT CARD
            ========================== */

            .print-card {
              margin: 0 !important;
              padding: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              overflow: visible !important;
            }

            .print-card h2 {
              margin: 3px 0 5px 0 !important;
              padding: 0 !important;
              font-size: 13px !important;
              line-height: 1.2 !important;
            }

            /* =========================
               TABLE
            ========================== */

            table {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border-collapse: collapse !important;
              table-layout: fixed !important;
              font-size: 9px !important;
            }

            th {
              padding: 4px 5px !important;
              font-size: 9px !important;
              line-height: 1.1 !important;
              white-space: normal !important;
            }

            td {
              padding: 4px 5px !important;
              font-size: 9px !important;
              line-height: 1.1 !important;
              white-space: normal !important;
              word-wrap: break-word !important;
              vertical-align: top !important;
            }

            /* =========================
               REMARK INPUT
            ========================== */

            input {
              border: none !important;
              outline: none !important;
              background: transparent !important;
              padding: 0 !important;
              margin: 0 !important;
              font-size: 9px !important;
              width: 100% !important;
              height: auto !important;
              color: black !important;
            }

            input::placeholder {
              color: #555 !important;
              opacity: 1 !important;
            }

            .saving {
              display: none !important;
            }

            /* =========================
               TABLE ROWS
            ========================== */

            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            thead {
              display: table-header-group;
            }

            /* =========================
               REMOVE EXTRA SPACING
            ========================== */

            div {
              box-shadow: none !important;
            }

            h1,
            h2,
            h3,
            p {
              page-break-after: avoid !important;
            }

          }

        `}
      </style>

    </div>
  );
}

const styles = {

  /* =========================
     PAGE
  ========================== */

  page: {
    padding: "30px",
    background: "var(--bg)",
    minHeight: "100vh",
  },

  /* =========================
     HEADER
  ========================== */

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    gap: "20px",
  },

  title: {
    margin: 0,
  },

  subtitle: {
    color: "#777",
    marginTop: "5px",
  },

  /* =========================
     BUTTON
  ========================== */

  printButton: {
    background: "#111827",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  /* =========================
     FILTERS
  ========================== */

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

  /* =========================
     PRINT HEADER
  ========================== */

  printHeader: {
    marginBottom: "20px",
  },

  /* =========================
     TOTAL CARD
  ========================== */

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

  /* =========================
     TABLE CARD
  ========================== */

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

  /* =========================
     REMARKS
  ========================== */

  remarkContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  remarkInput: {
    width: "180px",
    padding: "8px 10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "13px",
    outline: "none",
  },

  saving: {
    fontSize: "11px",
    color: "#888",
  },

  /* =========================
     EMPTY
  ========================== */

  empty: {
    textAlign: "center",
    padding: "40px",
    color: "#777",
  },
};

export default TechnicianEarnings;