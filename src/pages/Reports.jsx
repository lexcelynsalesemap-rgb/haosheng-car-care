import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";

function Reports() {
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [jobServices, setJobServices] = useState([]);

  // =========================================================
  // MANUAL REPORT SETTINGS
  // =========================================================

  const [manualPending, setManualPending] = useState({
    June: 7000,
    July: 10000,
    August: 18700,
  });

  const [manualTeyseer, setManualTeyseer] = useState(181200);

  const [savingSetting, setSavingSetting] = useState("");

  // =========================================================
  // REPORT DATE
  // =========================================================

  const [reportDate, setReportDate] = useState(() => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  });

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    loadReports();
    loadReportSettings();
  }, []);

  async function loadReports() {
    // IMPORTANT:
    // We do NOT order by created_at because your jobs table
    // does not have a created_at column.

    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("*");

    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .select("*");

    const { data: serviceData, error: serviceError } = await supabase
      .from("job_services")
      .select("*");

    console.log("REPORT JOBS:", jobData);
    console.log("REPORT PAYMENTS:", paymentData);
    console.log("REPORT SERVICES:", serviceData);

    if (jobError) {
      console.error("JOB ERROR:", jobError);
      alert("Could not load jobs: " + jobError.message);
    }

    if (paymentError) {
      console.error("PAYMENT ERROR:", paymentError);
      alert("Could not load payments: " + paymentError.message);
    }

    if (serviceError) {
      console.error("SERVICE ERROR:", serviceError);
      alert("Could not load services: " + serviceError.message);
    }

    setJobs(jobData || []);
    setPayments(paymentData || []);
    setJobServices(serviceData || []);
  }

  // =========================================================
  // LOAD REPORT SETTINGS
  // TABLE: report_settings
  // =========================================================

  async function loadReportSettings() {
    const { data, error } = await supabase
      .from("report_settings")
      .select("*");

    if (error) {
      console.error("REPORT SETTINGS ERROR:", error);

      alert(
        "Could not load report settings: " +
          error.message
      );

      return;
    }

    console.log("REPORT SETTINGS:", data);

    if (!data) {
      return;
    }

    const june = data.find(
      item => item.setting_name === "June Pending"
    );

    const july = data.find(
      item => item.setting_name === "July Pending"
    );

    const august = data.find(
      item => item.setting_name === "August Pending"
    );

    const teyseer = data.find(
      item => item.setting_name === "Previous Teyseer"
    );

    setManualPending({
      June: june
        ? Number(june.amount) || 0
        : 7000,

      July: july
        ? Number(july.amount) || 0
        : 10000,

      August: august
        ? Number(august.amount) || 0
        : 18700,
    });

    if (teyseer) {
      setManualTeyseer(
        Number(teyseer.amount) || 0
      );
    }
  }

  // =========================================================
  // SAVE REPORT SETTING
  // =========================================================

  async function saveSetting(settingName, amount) {
    try {
      setSavingSetting(settingName);

      const numericAmount = Number(amount) || 0;

      // First try to update an existing row
      const {
        data: updatedRows,
        error: updateError,
      } = await supabase
        .from("report_settings")
        .update({
          amount: numericAmount,
        })
        .eq("setting_name", settingName)
        .select();

      if (updateError) {
        console.error(
          "UPDATE SETTING ERROR:",
          updateError
        );

        alert(
          `Could not save ${settingName}: ${updateError.message}`
        );

        return;
      }

      // If row does not exist, insert it
      if (
        !updatedRows ||
        updatedRows.length === 0
      ) {
        const {
          error: insertError,
        } = await supabase
          .from("report_settings")
          .insert({
            setting_name: settingName,
            amount: numericAmount,
          });

        if (insertError) {
          console.error(
            "INSERT SETTING ERROR:",
            insertError
          );

          alert(
            `Could not save ${settingName}: ${insertError.message}`
          );

          return;
        }
      }

      console.log(
        `${settingName} saved:`,
        numericAmount
      );
    } finally {
      setSavingSetting("");
    }
  }

  // =========================================================
  // CHANGE JUNE
  // =========================================================

  function changeJune(value) {
    const amount = Number(value) || 0;

    setManualPending(prev => ({
      ...prev,
      June: amount,
    }));

    saveSetting(
      "June Pending",
      amount
    );
  }

  // =========================================================
  // CHANGE JULY
  // =========================================================

  function changeJuly(value) {
    const amount = Number(value) || 0;

    setManualPending(prev => ({
      ...prev,
      July: amount,
    }));

    saveSetting(
      "July Pending",
      amount
    );
  }

  // =========================================================
  // CHANGE AUGUST
  // =========================================================

  function changeAugust(value) {
    const amount = Number(value) || 0;

    setManualPending(prev => ({
      ...prev,
      August: amount,
    }));

    saveSetting(
      "August Pending",
      amount
    );
  }

  // =========================================================
  // CHANGE TEYSEER
  // =========================================================

  function changeTeyseer(value) {
    const amount = Number(value) || 0;

    setManualTeyseer(amount);

    saveSetting(
      "Previous Teyseer",
      amount
    );
  }

  // =========================================================
  // GENERAL FINANCIAL REPORT
  // =========================================================

  const netSales = jobs.reduce(
    (sum, job) =>
      sum +
      Number(job.price || 0) -
      Number(job.discount || 0),
    0
  );

  const paid = payments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  );

  const balance = netSales - paid;

  // =========================================================
  // PAYMENT METHODS
  //
  // Your database contains:
  // Visa
  // Mastercard
  // Cash
  // Bank Transfer
  //
  // Visa + Mastercard = Card
  // =========================================================

  function getPaymentMethod(payment) {
    return String(
      payment.payment_method ||
        payment.method ||
        payment.type ||
        ""
    )
      .trim()
      .toLowerCase();
  }

  // =========================================================
  // CASH
  // =========================================================

  const cashPaid = payments
    .filter(payment => {
      const method = getPaymentMethod(payment);

      return (
        method === "cash" ||
        method.includes("cash")
      );
    })
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  // =========================================================
  // CARD
  // VISA + MASTERCARD + CARD
  // =========================================================

  const cardPaid = payments
    .filter(payment => {
      const method = getPaymentMethod(payment);

      return (
        method === "card" ||
        method.includes("card") ||
        method === "visa" ||
        method.includes("visa") ||
        method === "mastercard" ||
        method === "master card" ||
        method.includes("mastercard") ||
        method.includes("master card")
      );
    })
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  // =========================================================
  // BANK TRANSFER
  // =========================================================

  const bankTransferPaid = payments
    .filter(payment => {
      const method = getPaymentMethod(payment);

      return (
        method === "bank transfer" ||
        method === "bank_transfer" ||
        method.includes("bank") ||
        method.includes("transfer")
      );
    })
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  // =========================================================
  // OTHER PAYMENT METHODS
  // =========================================================

  const knownPaymentTotal =
    cashPaid +
    cardPaid +
    bankTransferPaid;

  const otherPaid =
    paid - knownPaymentTotal;

  // =========================================================
  // TEYSEER
  // =========================================================

  const teyseerSources = [
    "Teyseer Motors",
    "Teyseer Motors - Bahaa",
    "Teyseer Motors - Salah",
  ];

  const teyseerJobs = jobs.filter(job =>
    teyseerSources.includes(job.source)
  );

  const customerJobs = jobs.filter(
    job =>
      !teyseerSources.includes(job.source)
  );

  // =========================================================
  // TEYSEER SALES
  // =========================================================

  let teyseerSales = 0;

  teyseerJobs.forEach(job => {
    const services =
      jobServices.filter(
        service =>
          String(service.job_id) ===
          String(job.id)
      );

    services.forEach(service => {
      const amount =
        Number(service.price || 0);

      const serviceName = String(
        service.service_name ||
          service.name ||
          ""
      ).toLowerCase();

      let reportSource =
        "Sales Team";

      if (
        job.source ===
        "Teyseer Motors"
      ) {
        reportSource =
          "Teyseer Motors";
      } else if (
        job.source ===
        "Teyseer Motors - Salah"
      ) {
        if (
          serviceName.includes(
            "full wtt"
          )
        ) {
          reportSource =
            "Teyseer Motors";
        } else {
          reportSource = "Salah";
        }
      } else if (
        job.source ===
        "Teyseer Motors - Bahaa"
      ) {
        if (
          serviceName.includes(
            "full wtt"
          )
        ) {
          reportSource =
            "Teyseer Motors";
        } else {
          reportSource = "Bahaa";
        }
      }

      if (
        reportSource ===
        "Teyseer Motors"
      ) {
        teyseerSales += amount;
      }
    });
  });

  // =========================================================
  // CUSTOMER SALES
  // =========================================================

  const customerSales =
    customerJobs.reduce(
      (sum, job) =>
        sum +
        Number(job.price || 0) -
        Number(job.discount || 0),
      0
    );

  // =========================================================
  // TEYSEER PAID
  // =========================================================

  const teyseerIds =
    teyseerJobs.map(job => job.id);

  const teyseerPaid = payments
    .filter(payment =>
      teyseerIds.some(
        id =>
          String(id) ===
          String(payment.job_id)
      )
    )
    .reduce(
      (sum, payment) =>
        sum +
        Number(payment.amount || 0),
      0
    );

  // =========================================================
  // CUSTOMER PAID
  // =========================================================

  const customerIds =
    customerJobs.map(job => job.id);

  const customerPaid = payments
    .filter(payment =>
      customerIds.some(
        id =>
          String(id) ===
          String(payment.job_id)
      )
    )
    .reduce(
      (sum, payment) =>
        sum +
        Number(payment.amount || 0),
      0
    );

  const customerBalance =
    customerSales - customerPaid;

  // =========================================================
  // DATE HELPERS
  // =========================================================

  function getDateString(date) {
    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getJobDate(job) {
    /*
      Your jobs table does not have created_at.
      We try common date fields instead.

      If your actual job date column has another name,
      add it here.
    */

    const rawDate =
      job.created_at ||
      job.date ||
      job.job_date ||
      job.createdDate ||
      job.created_date;

    if (!rawDate) {
      return null;
    }

    const date =
      new Date(rawDate);

    if (isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleDateString(
      "en-CA",
      {
        timeZone:
          "Asia/Qatar",
      }
    );
  }

  // =========================================================
  // TODAY
  // =========================================================

  const today =
    new Date().toLocaleDateString(
      "en-CA",
      {
        timeZone:
          "Asia/Qatar",
      }
    );

  const carsToday =
    jobs.filter(
      job =>
        getJobDate(job) ===
        today
    ).length;

  // =========================================================
  // THIS WEEK
  // =========================================================

  const currentDate =
    new Date();

  const startOfWeek =
    new Date(currentDate);

  const day =
    startOfWeek.getDay();

  const difference =
    day === 0
      ? 6
      : day - 1;

  startOfWeek.setDate(
    startOfWeek.getDate() -
      difference
  );

  startOfWeek.setHours(
    0,
    0,
    0,
    0
  );

  const weekStart =
    getDateString(
      startOfWeek
    );

  const carsThisWeek =
    jobs.filter(job => {
      const jobDate =
        getJobDate(job);

      return (
        jobDate &&
        jobDate >=
          weekStart &&
        jobDate <= today
      );
    }).length;

  // =========================================================
  // THIS MONTH
  // =========================================================

  const startOfMonth =
    new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );

  const monthStart =
    getDateString(
      startOfMonth
    );

  const carsThisMonth =
    jobs.filter(job => {
      const jobDate =
        getJobDate(job);

      return (
        jobDate &&
        jobDate >=
          monthStart &&
        jobDate <= today
      );
    }).length;

  // =========================================================
  // DAILY CARS
  // =========================================================

  const dailyCars = {};

  jobs.forEach(job => {
    const date =
      getJobDate(job);

    if (!date) {
      return;
    }

    if (!dailyCars[date]) {
      dailyCars[date] = 0;
    }

    dailyCars[date]++;
  });

  const dailyCarRows =
    Object.entries(dailyCars)
      .sort(
        ([dateA], [dateB]) =>
          dateB.localeCompare(dateA)
      );

  // =========================================================
  // PRINT DAILY REPORT
  // =========================================================

  function printDailyReport() {
    const selectedDate =
      reportDate;

    const todayJobs =
      jobs.filter(
        job =>
          getJobDate(job) ===
          selectedDate
      );

    if (
      todayJobs.length === 0
    ) {
      alert(
        `No cars found for ${selectedDate}.`
      );

      return;
    }

    const totalSales =
      todayJobs.reduce(
        (sum, job) =>
          sum +
          Number(job.price || 0) -
          Number(job.discount || 0),
        0
      );

    const totalPaid =
      todayJobs.reduce(
        (sum, job) => {
          const jobPayments =
            payments.filter(
              payment =>
                String(payment.job_id) ===
                String(job.id)
            );

          return (
            sum +
            jobPayments.reduce(
              (
                paymentSum,
                payment
              ) =>
                paymentSum +
                Number(
                  payment.amount || 0
                ),
              0
            )
          );
        },
        0
      );

    const totalBalance =
      totalSales - totalPaid;

    const reportRows =
      todayJobs
        .map(
          (job, index) => {
            const jobPayments =
              payments.filter(
                payment =>
                  String(payment.job_id) ===
                  String(job.id)
              );

            const jobPaid =
              jobPayments.reduce(
                (sum, payment) =>
                  sum +
                  Number(
                    payment.amount ||
                      0
                  ),
                0
              );

            const price =
              Number(
                job.price || 0
              );

            const discount =
              Number(
                job.discount || 0
              );

            const netAmount =
              price - discount;

            const jobBalance =
              netAmount -
              jobPaid;

            let jobTime = "";

            const rawDate =
              job.created_at ||
              job.date ||
              job.job_date ||
              job.createdDate ||
              job.created_date;

            if (
              rawDate
            ) {
              const date =
                new Date(
                  rawDate
                );

              if (
                !isNaN(
                  date.getTime()
                )
              ) {
                jobTime =
                  date.toLocaleTimeString(
                    "en-US",
                    {
                      timeZone:
                        "Asia/Qatar",
                      hour:
                        "2-digit",
                      minute:
                        "2-digit",
                    }
                  );
              }
            }

            let services =
              "No services";

            if (
              Array.isArray(
                job.services
              )
            ) {
              services =
                job.services
                  .map(
                    service => {
                      if (
                        typeof service ===
                        "string"
                      ) {
                        return service;
                      }

                      return (
                        service?.name ||
                        service?.service_name ||
                        service?.title ||
                        ""
                      );
                    }
                  )
                  .filter(Boolean)
                  .join(", ");
            } else if (
              typeof job.services ===
              "string"
            ) {
              services =
                job.services.trim() ||
                "No services";
            }

            return `
              <tr>
                <td>${index + 1}</td>
                <td>${jobTime}</td>
                <td>${job.customer || ""}</td>
                <td>${job.phone || ""}</td>
                <td>${job.carModel || job.car_model || ""}</td>
                <td>${job.plate || ""}</td>
                <td>${job.source || "Not specified"}</td>
                <td>${services}</td>

                <td class="money">
                  QAR ${netAmount.toLocaleString()}
                </td>

                <td class="money paid">
                  QAR ${jobPaid.toLocaleString()}
                </td>

                <td class="money balance">
                  QAR ${jobBalance.toLocaleString()}
                </td>
              </tr>
            `;
          }
        )
        .join("");

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1500,height=900"
      );

    if (!printWindow) {
      alert(
        "Please allow pop-ups for this website."
      );

      return;
    }

    printWindow.document.open();

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

      <head>

        <title>
          Daily Workshop Report
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            color: #111827;
            padding: 25px;
            margin: 0;
          }

          h1 {
            margin: 0;
            font-size: 28px;
          }

          .date {
            color: #64748b;
            margin-top: 5px;
            margin-bottom: 25px;
          }

          .summary {
            display: grid;
            grid-template-columns:
              repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }

          .summaryBox {
            border: 1px solid #d1d5db;
            border-radius: 10px;
            padding: 15px;
            background: #f8fafc;
          }

          .summaryLabel {
            font-size: 12px;
            color: #64748b;
          }

          .summaryValue {
            font-size: 20px;
            font-weight: bold;
            margin-top: 5px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }

          th {
            background: #111827;
            color: white;
            padding: 9px 6px;
            border: 1px solid #111827;
            text-align: left;
          }

          td {
            padding: 8px 6px;
            border: 1px solid #d1d5db;
            vertical-align: top;
          }

          tr:nth-child(even) {
            background: #f8fafc;
          }

          .money {
            text-align: right;
            white-space: nowrap;
          }

          .paid {
            color: #15803d;
          }

          .balance {
            color: #dc2626;
          }

          .signature {
            margin-top: 45px;
            display: flex;
            justify-content: space-between;
          }

          .signatureBox {
            width: 200px;
            text-align: center;
            border-top: 1px solid #111827;
            padding-top: 8px;
            font-size: 12px;
          }

          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #d1d5db;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #64748b;
          }

          @media print {

            @page {
              size: landscape;
              margin: 10mm;
            }

            body {
              padding: 5px;
            }

          }

        </style>

      </head>

      <body>

        <h1>
          🚗 Daily Workshop Report
        </h1>

        <div class="date">
          Date: ${selectedDate}
        </div>

        <div class="summary">

          <div class="summaryBox">
            <div class="summaryLabel">
              TOTAL CARS
            </div>

            <div class="summaryValue">
              ${todayJobs.length}
            </div>
          </div>

          <div class="summaryBox">
            <div class="summaryLabel">
              NET SALES
            </div>

            <div class="summaryValue">
              QAR ${totalSales.toLocaleString()}
            </div>
          </div>

          <div class="summaryBox">
            <div class="summaryLabel">
              TOTAL PAID
            </div>

            <div class="summaryValue">
              QAR ${totalPaid.toLocaleString()}
            </div>
          </div>

          <div class="summaryBox">
            <div class="summaryLabel">
              BALANCE DUE
            </div>

            <div class="summaryValue">
              QAR ${totalBalance.toLocaleString()}
            </div>
          </div>

        </div>

        <table>

          <thead>

            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Car</th>
              <th>Plate</th>
              <th>Source</th>
              <th>Services</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>

          </thead>

          <tbody>

            ${reportRows}

          </tbody>

        </table>

        <div class="signature">

          <div class="signatureBox">
            Prepared By
          </div>

          <div class="signatureBox">
            Checked By
          </div>

          <div class="signatureBox">
            Manager
          </div>

        </div>

        <div class="footer">

          <span>
            Workshop Daily Report
          </span>

          <span>
            Printed:
            ${new Date().toLocaleString(
              "en-US",
              {
                timeZone:
                  "Asia/Qatar",
              }
            )}
          </span>

        </div>

      </body>

      </html>
    `);

    printWindow.document.close();

    printWindow.onload =
      function () {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      };
  }

  // =========================================================
  // DISPLAY
  // =========================================================

  return (
    <div
      style={{
        padding: "30px",
        background: "#f1f5f9",
        minHeight: "100vh",
      }}
    >
      <h1>
        📊 Reports
      </h1>

      {/* DATE */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "15px",
          flexWrap: "wrap",
        }}
      >
        <label
          style={{
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          📅 Report Date:
        </label>

        <input
          type="date"
          value={reportDate}
          onChange={e =>
            setReportDate(
              e.target.value
            )
          }
          style={{
            padding:
              "10px 12px",
            borderRadius:
              "8px",
            border:
              "1px solid #cbd5e1",
            fontSize: "16px",
          }}
        />
      </div>

      <button
        onClick={printDailyReport}
        style={{
          background: "#111827",
          color: "white",
          border: "none",
          padding:
            "12px 20px",
          borderRadius:
            "10px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "bold",
          marginBottom:
            "25px",
        }}
      >
        🖨️ Print Daily Report
      </button>

      {/* FINANCIAL SUMMARY */}

      <h2>
        💰 Financial Summary
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: "20px",
          marginBottom:
            "30px",
        }}
      >
        <FinancialCard
          title="Total Sales"
          value={netSales}
          color="#2563eb"
          icon="💰"
        />

        <FinancialCard
          title="Total Paid"
          value={paid}
          color="#16a34a"
          icon="💳"
        />

        <FinancialCard
          title="Total Balance"
          value={balance}
          color="#dc2626"
          icon="⚠️"
        />

        <FinancialCard
          title="Teyseer Sales"
          value={teyseerSales}
          color="#9333ea"
          icon="🏢"
        />
      </div>

      {/* PAYMENT METHODS */}

      <h2>
        💳 Payment Methods
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: "20px",
          marginBottom:
            "30px",
        }}
      >
        <FinancialCard
          title="Cash"
          value={cashPaid}
          color="#16a34a"
          icon="💵"
        />

        <FinancialCard
          title="Card (Visa + Mastercard)"
          value={cardPaid}
          color="#2563eb"
          icon="💳"
        />

        <FinancialCard
          title="Bank Transfer"
          value={bankTransferPaid}
          color="#7c3aed"
          icon="🏦"
        />

        {otherPaid > 0 && (
          <FinancialCard
            title="Other"
            value={otherPaid}
            color="#f59e0b"
            icon="💰"
          />
        )}
      </div>

      {/* PREVIOUS MONTH PENDING */}

      <h2>
        📅 Previous Month Pending
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: "20px",
          marginBottom:
            "30px",
        }}
      >
        <ManualCard
          title="June Pending"
          value={manualPending.June}
          saving={
            savingSetting ===
            "June Pending"
          }
          onChange={
            changeJune
          }
        />

        <ManualCard
          title="July Pending"
          value={manualPending.July}
          saving={
            savingSetting ===
            "July Pending"
          }
          onChange={
            changeJuly
          }
        />

        <ManualCard
          title="August Pending"
          value={manualPending.August}
          saving={
            savingSetting ===
            "August Pending"
          }
          onChange={
            changeAugust
          }
        />
      </div>

      {/* PREVIOUS TEYSEER */}

      <h2>
        🏢 Previous Teyseer
      </h2>

      <div
        style={{
          background: "white",
          padding: "25px",
          borderRadius: "18px",
          boxShadow:
            "0 8px 20px rgba(0,0,0,0.08)",
          marginBottom:
            "30px",
        }}
      >
        <h3>
          Previous Teyseer Amount
        </h3>

        <input
          type="number"
          value={manualTeyseer}
          onChange={e =>
            changeTeyseer(
              e.target.value
            )
          }
          style={{
            width: "100%",
            maxWidth: "350px",
            padding: "12px",
            fontSize: "18px",
            border:
              "1px solid #cbd5e1",
            borderRadius:
              "8px",
          }}
        />

        {savingSetting ===
          "Previous Teyseer" && (
          <div
            style={{
              color: "#16a34a",
              marginTop: "8px",
              fontSize: "14px",
            }}
          >
            ✓ Saving...
          </div>
        )}

        <h2
          style={{
            color: "#9333ea",
          }}
        >
          QAR{" "}
          {manualTeyseer.toLocaleString()}
        </h2>
      </div>

      {/* CAR REPORT */}

      <h2>
        🚗 Car Reports
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: "20px",
          marginBottom:
            "30px",
        }}
      >
        <FinancialCard
          title="Total Cars"
          value={jobs.length}
          color="#2563eb"
          icon="🚗"
          noCurrency
        />

        <FinancialCard
          title="Cars Today"
          value={carsToday}
          color="#0891b2"
          icon="📅"
          noCurrency
        />

        <FinancialCard
          title="Cars This Week"
          value={carsThisWeek}
          color="#7c3aed"
          icon="📆"
          noCurrency
        />

        <FinancialCard
          title="Cars This Month"
          value={carsThisMonth}
          color="#ea580c"
          icon="🗓️"
          noCurrency
        />
      </div>

      {/* DAILY CARS */}

      <div
        style={{
          background: "white",
          padding: "25px",
          borderRadius: "18px",
          boxShadow:
            "0 8px 20px rgba(0,0,0,0.08)",
          marginBottom:
            "30px",
        }}
      >
        <h2>
          📊 Cars Received Per Day
        </h2>

        {dailyCarRows.length ===
        0 ? (
          <p>
            No car records found.
          </p>
        ) : (
          <div
            style={{
              overflowX:
                "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={
                      tableHeader
                    }
                  >
                    Date
                  </th>

                  <th
                    style={
                      tableHeader
                    }
                  >
                    Cars Received
                  </th>
                </tr>
              </thead>

              <tbody>
                {dailyCarRows.map(
                  ([date, count]) => {
                    const formattedDate =
                      new Date(
                        `${date}T00:00:00`
                      ).toLocaleDateString(
                        "en-US",
                        {
                          weekday:
                            "short",
                          year:
                            "numeric",
                          month:
                            "short",
                          day:
                            "numeric",
                        }
                      );

                    return (
                      <tr
                        key={
                          date
                        }
                      >
                        <td
                          style={
                            tableCell
                          }
                        >
                          <strong>
                            {
                              formattedDate
                            }
                          </strong>
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          <span
                            style={{
                              background:
                                "#dbeafe",
                              color:
                                "#1d4ed8",
                              padding:
                                "7px 15px",
                              borderRadius:
                                "20px",
                              fontWeight:
                                "bold",
                            }}
                          >
                            🚗{" "}
                            {
                              count
                            }
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SOURCE REPORT */}

      <h2>
        🏢 Source Reports
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(250px,1fr))",
          gap: "20px",
          marginBottom:
            "30px",
        }}
      >
        <div
          style={
            sourceCardStyle
          }
        >
          <h2>
            🏢 Teyseer
          </h2>

          <p>
            Cars:{" "}
            {
              teyseerJobs.length
            }
          </p>

          <p>
            Sales: QAR{" "}
            {teyseerSales.toLocaleString()}
          </p>

          <p>
            Paid: QAR{" "}
            {teyseerPaid.toLocaleString()}
          </p>
        </div>

        <div
          style={
            sourceCardStyle
          }
        >
          <h2>
            👤 Customers / Other
          </h2>

          <p>
            Cars:{" "}
            {
              customerJobs.length
            }
          </p>

          <p>
            Sales: QAR{" "}
            {customerSales.toLocaleString()}
          </p>

          <p>
            Paid: QAR{" "}
            {customerPaid.toLocaleString()}
          </p>

          <p>
            Balance: QAR{" "}
            {customerBalance.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// FINANCIAL CARD
// =========================================================

function FinancialCard({
  title,
  value,
  color,
  icon,
  noCurrency,
}) {
  return (
    <div
      style={{
        background: "white",
        padding: "25px",
        borderRadius: "18px",
        boxShadow:
          "0 8px 20px rgba(0,0,0,0.08)",
        textAlign: "center",
        borderTop:
          `5px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: "35px",
          marginBottom: "10px",
        }}
      >
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <h2>
        {noCurrency
          ? Number(
              value
            ).toLocaleString()
          : `QAR ${Number(
              value
            ).toLocaleString()}`}
      </h2>
    </div>
  );
}

// =========================================================
// MANUAL CARD
// =========================================================

function ManualCard({
  title,
  value,
  onChange,
  saving,
}) {
  return (
    <div
      style={{
        background: "white",
        padding: "25px",
        borderRadius: "18px",
        boxShadow:
          "0 8px 20px rgba(0,0,0,0.08)",
        borderTop:
          "5px solid #dc2626",
      }}
    >
      <h3>
        {title}
      </h3>

      <label
        style={{
          display: "block",
          color: "#64748b",
          marginBottom: "8px",
        }}
      >
        Enter amount
      </label>

      <input
        type="number"
        value={value}
        onChange={e =>
          onChange(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: "12px",
          fontSize: "18px",
          border:
            "1px solid #cbd5e1",
          borderRadius:
            "8px",
        }}
      />

      {saving && (
        <div
          style={{
            color: "#16a34a",
            marginTop: "8px",
            fontSize: "14px",
          }}
        >
          ✓ Saving...
        </div>
      )}

      <h2
        style={{
          color: "#dc2626",
        }}
      >
        QAR{" "}
        {Number(
          value
        ).toLocaleString()}
      </h2>
    </div>
  );
}

// =========================================================
// SOURCE CARD
// =========================================================

const sourceCardStyle = {
  background: "white",
  padding: "25px",
  borderRadius: "18px",
  boxShadow:
    "0 8px 20px rgba(0,0,0,0.08)",
};

// =========================================================
// TABLE
// =========================================================

const tableHeader = {
  textAlign: "left",
  padding: "14px",
  background: "#f8fafc",
  borderBottom:
    "2px solid #e2e8f0",
};

const tableCell = {
  padding: "15px",
  borderBottom:
    "1px solid #e2e8f0",
};

export default Reports;