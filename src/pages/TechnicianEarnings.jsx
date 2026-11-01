
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/client";
import * as XLSX from "xlsx";

function TechnicianEarnings() {
  const [earnings, setEarnings] = useState([]);
  const [staffFilter, setStaffFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("");
  const [saving, setSaving] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Handles Supabase relationships returned as objects or arrays.
  function relationOne(value) {
    return Array.isArray(value) ? value[0] || null : value || null;
  }

  function getJob(row) {
    const service = relationOne(row.job_services);
    return relationOne(service?.jobs);
  }

  function getTechnician(row) {
    return relationOne(row.technicians);
  }

  function getService(row) {
    return relationOne(row.job_services);
  }

  // Load earnings from existing Supabase tables.
  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("service_technicians")
      .select(`
        id,
        commission,
        remarks,
        technicians (
          name
        ),
        job_services (
          service_name,
          jobs (
            carModel,
            plate,
            created_at
          )
        )
      `);

    if (error) {
      console.error("Technician earnings error:", error);
      setErrorMessage(error.message || "Could not load earnings.");
      setLoading(false);
      return;
    }

    setEarnings(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Unique technician names.
  const staffNames = useMemo(() => {
    return [
      ...new Set(
        earnings
          .map((row) => getTechnician(row)?.name)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [earnings]);

  // Apply staff and month filters, then sort newest to oldest.
  const filteredEarnings = useMemo(() => {
    return earnings
      .filter((row) => {
        const staffName =
          getTechnician(row)?.name || "Unknown";

        const job = getJob(row);

        const staffMatch =
          staffFilter === "All" ||
          staffName === staffFilter;

        let monthMatch = true;

        if (monthFilter) {
          if (!job?.created_at) {
            monthMatch = false;
          } else {
            const date = new Date(job.created_at);

            const year = date.getFullYear();
            const month = String(
              date.getMonth() + 1
            ).padStart(2, "0");

            monthMatch =
              `${year}-${month}` === monthFilter;
          }
        }

        return staffMatch && monthMatch;
      })
      .sort((a, b) => {
        const dateA = new Date(
          getJob(a)?.created_at || 0
        ).getTime();

        const dateB = new Date(
          getJob(b)?.created_at || 0
        ).getTime();

        return dateB - dateA;
      });
  }, [earnings, staffFilter, monthFilter]);

  // Commission calculations remain unchanged.
  const totalCommission = filteredEarnings.reduce(
    (total, row) =>
      total + Number(row.commission || 0),
    0
  );

  const totalServices = filteredEarnings.length;

  const averageCommission =
    totalServices > 0
      ? totalCommission / totalServices
      : 0;

  // Technician commission summary.
  const technicianSummary = useMemo(() => {
    const summary = {};

    filteredEarnings.forEach((row) => {
      const name =
        getTechnician(row)?.name || "Unknown";

      if (!summary[name]) {
        summary[name] = {
          name,
          services: 0,
          commission: 0,
        };
      }

      summary[name].services += 1;

      summary[name].commission += Number(
        row.commission || 0
      );
    });

    return Object.values(summary).sort(
      (a, b) => b.commission - a.commission
    );
  }, [filteredEarnings]);

  // Monthly commission summary.
  const monthlySummary = useMemo(() => {
    const summary = {};

    filteredEarnings.forEach((row) => {
      const job = getJob(row);

      if (!job?.created_at) return;

      const date = new Date(job.created_at);

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
      ].join("-");

      if (!summary[key]) {
        summary[key] = {
          month: key,
          services: 0,
          commission: 0,
        };
      }

      summary[key].services += 1;

      summary[key].commission += Number(
        row.commission || 0
      );
    });

    return Object.values(summary).sort(
      (a, b) => b.month.localeCompare(a.month)
    );
  }, [filteredEarnings]);

  function formatCurrency(amount) {
    return `QAR ${Number(amount || 0).toFixed(2)}`;
  }

  function formatDate(value) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatMonth(value) {
    if (!value) return "";

    const [year, month] = value.split("-");

    return new Date(
      Number(year),
      Number(month) - 1,
      1
    ).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  // Save remarks to Supabase.
  async function saveRemarks(id, remarks) {
    setSaving((current) => ({
      ...current,
      [id]: true,
    }));

    setSaveStatus((current) => ({
      ...current,
      [id]: "",
    }));

    const { error } = await supabase
      .from("service_technicians")
      .update({ remarks })
      .eq("id", id);

    if (error) {
      console.error("Remarks save error:", error);

      setSaveStatus((current) => ({
        ...current,
        [id]: "error",
      }));

      alert("Could not save the remarks. Please try again.");
    } else {
      setSaveStatus((current) => ({
        ...current,
        [id]: "success",
      }));
    }

    setSaving((current) => ({
      ...current,
      [id]: false,
    }));
  }

  // Export filtered data to Excel.
  function exportExcel() {
    if (!filteredEarnings.length) {
      alert("There are no earnings to export.");
      return;
    }

    const earningsData = filteredEarnings.map((row) => {
      const job = getJob(row);
      const technician = getTechnician(row);
      const service = getService(row);

      return {
        Date: job?.created_at
          ? formatDate(job.created_at)
          : "-",

        "Car Model": job?.carModel || "-",

        Plate: job?.plate || "-",

        Service: service?.service_name || "-",

        Technician: technician?.name || "Unknown",

        Commission: Number(row.commission || 0),

        Remarks: row.remarks || "",
      };
    });

    const technicianData = technicianSummary.map(
      (item) => ({
        Technician: item.name,
        "Total Services": item.services,
        "Total Commission (QAR)": Number(
          item.commission.toFixed(2)
        ),
      })
    );

    const monthlyData = monthlySummary.map(
      (item) => ({
        Month: formatMonth(item.month),
        "Total Services": item.services,
        "Total Commission (QAR)": Number(
          item.commission.toFixed(2)
        ),
      })
    );

    const workbook = XLSX.utils.book_new();

    // Earnings worksheet.
    const earningsSheet =
      XLSX.utils.json_to_sheet(earningsData);

    XLSX.utils.book_append_sheet(
      workbook,
      earningsSheet,
      "Earnings"
    );

    // Technician summary worksheet.
    const technicianSheet =
      XLSX.utils.json_to_sheet(technicianData);

    XLSX.utils.book_append_sheet(
      workbook,
      technicianSheet,
      "Technician Summary"
    );

    // Monthly summary worksheet.
    const monthlySheet =
      XLSX.utils.json_to_sheet(monthlyData);

    XLSX.utils.book_append_sheet(
      workbook,
      monthlySheet,
      "Monthly Summary"
    );

    const safeMonth = monthFilter || "All-Months";

    const safeStaff =
      staffFilter === "All"
        ? "All-Staff"
        : staffFilter.replace(/[^a-zA-Z0-9-_]/g, "_");

    const fileName =
      `Technician_Earnings_${safeStaff}_${safeMonth}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  }

  function printReport() {
    window.print();
  }

  function clearFilters() {
    setStaffFilter("All");
    setMonthFilter("");
  }

  return (
    <div className="earnings-page">

      {/* SCREEN HEADER */}
      <div className="earnings-header no-print">
        <div>
          <h1>Technician Earnings</h1>
          <p>Staff commission and performance report</p>
        </div>

        <div className="header-actions">
          <button
            className="refresh-button"
            onClick={loadData}
            disabled={loading}
          >
            ↻ Refresh
          </button>

          <button
            className="excel-button"
            onClick={exportExcel}
            disabled={!filteredEarnings.length}
          >
            ↓ Export Excel
          </button>

          <button
            className="print-button"
            onClick={printReport}
            disabled={!filteredEarnings.length}
          >
            Print Report
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filter-card no-print">
        <div className="filter-group">
          <label>Technician</label>

          <select
            value={staffFilter}
            onChange={(e) =>
              setStaffFilter(e.target.value)
            }
          >
            <option value="All">All Staff</option>

            {staffNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Month</label>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) =>
              setMonthFilter(e.target.value)
            }
          />
        </div>

        <button
          className="clear-button"
          onClick={clearFilters}
        >
          Clear Filters
        </button>

        <div className="filter-note">
          Sorted by date: newest first
        </div>
      </div>

      {/* PRINT HEADER */}
      <div className="print-header">
        <h1>HAOSHENG CAR CARE</h1>
        <h2>Staff Earnings Report</h2>

        <p>
          Technician: <strong>{staffFilter}</strong>
        </p>

        <p>
          Month:{" "}
          <strong>
            {monthFilter
              ? formatMonth(monthFilter)
              : "All Months"}
          </strong>
        </p>

        <p>
          Generated:{" "}
          <strong>{new Date().toLocaleDateString("en-GB")}</strong>
        </p>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="message-card">
          Loading technician earnings...
        </div>
      )}

      {/* ERROR */}
      {!loading && errorMessage && (
        <div className="error-card">
          <strong>Unable to load earnings.</strong>
          <p>{errorMessage}</p>

          <button onClick={loadData}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !errorMessage && (
        <>
          {/* TOTAL CARDS */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">
                Total Services
              </div>

              <div className="stat-value">
                {totalServices}
              </div>

              <div className="stat-description">
                Services in selected filters
              </div>
            </div>

            <div className="stat-card commission-stat">
              <div className="stat-label">
                Total Commission
              </div>

              <div className="stat-value">
                {formatCurrency(totalCommission)}
              </div>

              <div className="stat-description">
                Total technician earnings
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                Technicians
              </div>

              <div className="stat-value">
                {technicianSummary.length}
              </div>

              <div className="stat-description">
                Technicians with matching services
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                Average Commission
              </div>

              <div className="stat-value">
                {formatCurrency(averageCommission)}
              </div>

              <div className="stat-description">
                Average per service
              </div>
            </div>
          </div>

          {/* TECHNICIAN SUMMARY */}
          <div className="report-card summary-card">
            <div className="section-heading">
              <div>
                <h2>Technician Summary</h2>
                <p>Commission totals by technician</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Total Services</th>
                    <th>Total Commission</th>
                  </tr>
                </thead>

                <tbody>
                  {technicianSummary.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="empty">
                        No technician data found.
                      </td>
                    </tr>
                  ) : (
                    technicianSummary.map((item) => (
                      <tr key={item.name}>
                        <td>
                          <strong>{item.name}</strong>
                        </td>

                        <td>{item.services}</td>

                        <td className="commission">
                          {formatCurrency(item.commission)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MONTHLY SUMMARY */}
          <div className="report-card summary-card">
            <div className="section-heading">
              <div>
                <h2>Monthly Commission Summary</h2>
                <p>Monthly earnings overview</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Total Services</th>
                    <th>Total Commission</th>
                  </tr>
                </thead>

                <tbody>
                  {monthlySummary.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="empty">
                        No monthly data found.
                      </td>
                    </tr>
                  ) : (
                    monthlySummary.map((item) => (
                      <tr key={item.month}>
                        <td>
                          <strong>
                            {formatMonth(item.month)}
                          </strong>
                        </td>

                        <td>{item.services}</td>

                        <td className="commission">
                          {formatCurrency(item.commission)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DETAILED EARNINGS */}
          <div className="report-card print-card">
            <div className="section-heading">
              <div>
                <h2>Detailed Earnings Report</h2>
                <p>
                  Individual service commission records
                </p>
              </div>

              <span className="record-count no-print">
                {filteredEarnings.length} Records
              </span>
            </div>

            <div className="table-wrapper">
              <table className="earnings-table">
                <thead>
                  <tr>
                    <th>Date ↓</th>
                    <th>Car Model</th>
                    <th>Plate</th>
                    <th>Service</th>
                    <th>Technician</th>
                    <th>Commission</th>
                    <th className="remarks-column">
                      Remarks
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEarnings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty">
                        No earnings found for the selected
                        filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEarnings.map((row) => {
                      const job = getJob(row);
                      const technician = getTechnician(row);
                      const service = getService(row);

                      return (
                        <tr key={row.id}>
                          <td className="date-cell">
                            {formatDate(job?.created_at)}
                          </td>

                          <td>
                            {job?.carModel || "-"}
                          </td>

                          <td>
                            {job?.plate || "-"}
                          </td>

                          <td>
                            {service?.service_name || "-"}
                          </td>

                          <td>
                            {technician?.name || "Unknown"}
                          </td>

                          <td className="commission">
                            {formatCurrency(row.commission)}
                          </td>

                          <td className="remarks-column">
                            <div className="remark-container">
                              <input
                                type="text"
                                value={row.remarks || ""}
                                placeholder="Add remark..."
                                onChange={(e) => {
                                  const value = e.target.value;

                                  setEarnings((current) =>
                                    current.map((item) =>
                                      item.id === row.id
                                        ? {
                                            ...item,
                                            remarks: value,
                                          }
                                        : item
                                    )
                                  );

                                  setSaveStatus((current) => ({
                                    ...current,
                                    [row.id]: "",
                                  }));
                                }}
                                onBlur={(e) =>
                                  saveRemarks(
                                    row.id,
                                    e.target.value
                                  )
                                }
                                disabled={saving[row.id]}
                              />

                              {saving[row.id] && (
                                <span className="saving">
                                  Saving...
                                </span>
                              )}

                              {!saving[row.id] &&
                                saveStatus[row.id] === "success" && (
                                  <span className="saved">
                                    Saved
                                  </span>
                                )}

                              {!saving[row.id] &&
                                saveStatus[row.id] === "error" && (
                                  <span className="save-error">
                                    Failed
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {filteredEarnings.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan="5">
                        <strong>TOTAL COMMISSION</strong>
                      </td>

                      <td className="commission">
                        <strong>
                          {formatCurrency(totalCommission)}
                        </strong>
                      </td>

                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* STYLES */}
      <style>{`

        .earnings-page {
          padding: 30px;
          min-height: 100vh;
          background: var(--bg, #f5f6fa);
          color: #1f2937;
        }

        .earnings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 25px;
          flex-wrap: wrap;
        }

        .earnings-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 750;
          color: #111827;
        }

        .earnings-header p {
          color: #777;
          margin: 7px 0 0;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .header-actions button,
        .clear-button {
          border: none;
          padding: 11px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .header-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .refresh-button {
          background: white;
          border: 1px solid #ddd !important;
          color: #374151;
        }

        .excel-button {
          background: #15803d;
          color: white;
        }

        .print-button {
          background: #111827;
          color: white;
        }

        .filter-card {
          background: white;
          border: 1px solid #e5e7eb;
          padding: 20px;
          border-radius: 13px;
          display: flex;
          align-items: end;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 25px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .filter-group label {
          font-size: 13px;
          font-weight: 650;
          color: #555;
        }

        .filter-group select,
        .filter-group input {
          padding: 11px 13px;
          min-width: 190px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          font-size: 14px;
        }

        .clear-button {
          background: #f3f4f6;
          border: 1px solid #ddd;
          color: #374151;
        }

        .filter-note {
          color: #64748b;
          font-size: 12px;
          padding-bottom: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 25px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 13px;
          padding: 21px;
          min-width: 0;
        }

        .stat-label {
          color: #6b7280;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .stat-value {
          font-size: 23px;
          font-weight: 750;
          color: #111827;
          overflow-wrap: anywhere;
        }

        .commission-stat .stat-value,
        .commission {
          color: #15803d;
          font-weight: 700;
        }

        .stat-description {
          color: #9ca3af;
          font-size: 12px;
          margin-top: 8px;
        }

        .report-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 13px;
          padding: 23px;
          margin-bottom: 22px;
          min-width: 0;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }

        .section-heading h2 {
          margin: 0;
          font-size: 19px;
          color: #111827;
        }

        .section-heading p {
          margin: 6px 0 0;
          font-size: 13px;
          color: #888;
        }

        .record-count {
          background: #f3f4f6;
          padding: 7px 11px;
          border-radius: 20px;
          font-size: 12px;
          color: #555;
          white-space: nowrap;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .earnings-page table {
          width: 100%;
          border-collapse: collapse;
          min-width: 650px;
        }

        .earnings-page th {
          background: #f8fafc;
          color: #64748b;
          text-align: left;
          padding: 13px 12px;
          font-size: 12px;
          font-weight: 700;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }

        .earnings-page td {
          padding: 13px 12px;
          font-size: 13px;
          border-bottom: 1px solid #eee;
          vertical-align: middle;
        }

        .earnings-page tbody tr:hover {
          background: #fafafa;
        }

        .date-cell {
          white-space: nowrap;
          font-weight: 600;
        }

        .earnings-table {
          min-width: 1050px !important;
        }

        .remarks-column {
          min-width: 190px;
        }

        .remark-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .remark-container input {
          width: 100%;
          box-sizing: border-box;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 12px;
          outline: none;
        }

        .remark-container input:focus {
          border-color: #64748b;
        }

        .saving,
        .saved,
        .save-error {
          font-size: 10px;
        }

        .saving {
          color: #64748b;
        }

        .saved {
          color: #15803d;
        }

        .save-error {
          color: #dc2626;
        }

        .earnings-page tfoot td {
          background: #f8fafc;
          padding: 15px 12px;
        }

        .empty {
          text-align: center;
          color: #999;
          padding: 35px !important;
        }

        .message-card,
        .error-card {
          padding: 25px;
          background: white;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .error-card {
          border: 1px solid #fecaca;
          color: #b91c1c;
        }

        .error-card button {
          padding: 9px 14px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .print-header {
          display: none;
        }

        @media (max-width: 1000px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .earnings-page {
            padding: 15px;
          }

          .earnings-header h1 {
            font-size: 23px;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .stat-card {
            padding: 15px;
          }

          .stat-value {
            font-size: 18px;
          }

          .filter-group,
          .filter-group select,
          .filter-group input {
            width: 100%;
            box-sizing: border-box;
          }

          .report-card {
            padding: 15px;
          }
        }

        @media print {

  @page {
    size: A4 portrait;
    margin: 5mm;
  }

          html,
          body,
          #root {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .earnings-page {
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
            background: white !important;
            color: black !important;
          }

          .no-print {
            display: none !important;
          }

          .print-header {
            display: block !important;
            margin-bottom: 12px !important;
          }

          .print-header h1 {
            font-size: 17px !important;
            margin: 0 0 3px !important;
          }

          .print-header h2 {
            font-size: 13px !important;
            margin: 0 0 6px !important;
          }

          .print-header p {
            display: inline-block;
            margin: 2px 18px 5px 0 !important;
            font-size: 9px !important;
          }

          .stats-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
            margin-bottom: 10px !important;
          }

          .stat-card {
            padding: 8px !important;
            border: 1px solid #ddd !important;
            border-radius: 4px !important;
            box-shadow: none !important;
          }

          .stat-label,
          .stat-description {
            font-size: 8px !important;
          }

          .stat-value {
            font-size: 13px !important;
          }

          .report-card {
            padding: 0 !important;
            margin: 0 0 10px !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .summary-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .section-heading {
            margin-bottom: 5px !important;
          }

          .section-heading h2 {
            font-size: 12px !important;
          }

          .section-heading p {
            font-size: 8px !important;
          }

          .table-wrapper {
            overflow: visible !important;
          }

          .earnings-page table {
  width: 100% !important;
  min-width: 0 !important;
  table-layout: fixed !important;
  border-collapse: collapse !important;
  font-size: 7px !important;
}

.earnings-page th,
.earnings-page td {
  padding: 4px 2px !important;
  font-size: 7px !important;
  overflow-wrap: anywhere !important;
}

          .earnings-page td {
            font-size: 8px !important;
            padding: 5px !important;
            border: 1px solid #ddd !important;
            color: black !important;
          }

          .earnings-page tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .earnings-page thead {
            display: table-header-group;
          }

          .earnings-page tfoot {
            display: table-row-group;
          }

          .remark-container input {
            border: none !important;
            padding: 0 !important;
            font-size: 8px !important;
            color: black !important;
            background: transparent !important;
          }

          .saving,
          .saved,
          .save-error {
            display: none !important;
          }

          .commission {
            color: black !important;
          }

          .earnings-page * {
            box-shadow: none !important;
            text-shadow: none !important;
          }
        }

      `}</style>
    </div>
  );
}

export default TechnicianEarnings;
