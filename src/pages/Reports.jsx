import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/client";
import gaLogo from "../assets/ga-logo.png";

/* ============================================================
   REPORT CALCULATION RULES
============================================================

1. NORMAL / CUSTOMER JOB
   Gross = job.price
   Discount = job.discount
   Net = max(price - discount, 0)
   Paid = all payments linked to the job
   Balance = Net - Paid

2. TEYSEER JOB
   Sources:
   - Teyseer Motors
   - Teyseer Motors - Salah
   - Teyseer Motors - Bahaa

   If job_services exist:
      Net = SUM(all job_services.price)

   If no services exist:
      Net = max(job.price - job.discount, 0)

3. PAYMENTS
   Payments are counted only from the payments table.
   A payment belongs to a job through payment.job_id.

4. BALANCE
   Balance = canonical job net - linked payments

5. AL NUSOOR
   Uses the same normal job calculation.

6. ALL DASHBOARD TOTALS
   Use the exact same canonical job amount.

============================================================ */

const TEYSEER_SOURCES = [
  "Teyseer Motors",
  "Teyseer Motors - Bahaa",
  "Teyseer Motors - Salah",
];

const DEFAULT_PENDING = {
  June: 7000,
  July: 10000,
  August: 18700,
};

const DEFAULT_PREVIOUS_TEYSEER = 181200;

/* ============================================================
   NUMBER HELPERS
============================================================ */

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function wholeMoney(value) {
  return number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

/* ============================================================
   DATE HELPERS - QATAR TIME
============================================================ */

function qatarDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Qatar",
  });
}

function todayQatar() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Qatar",
  });
}

function getJobDate(job) {
  return qatarDate(
    job.created_at ||
      job.job_date ||
      job.date ||
      job.createdDate
  );
}

function isDateInRange(date, startDate, endDate) {
  if (!date) return false;

  if (startDate && date < startDate) {
    return false;
  }

  if (endDate && date > endDate) {
    return false;
  }

  return true;
}

/* ============================================================
   JOB TYPE
============================================================ */

function isTeyseerJob(job) {
  return TEYSEER_SOURCES.includes(
    String(job.source || "").trim()
  );
}

/* ============================================================
   PAYMENT METHODS
============================================================ */

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

function isCash(payment) {
  return getPaymentMethod(payment).includes("cash");
}

function isCard(payment) {
  const method = getPaymentMethod(payment);

  return (
    method.includes("visa") ||
    method.includes("mastercard") ||
    method.includes("master card") ||
    method === "card" ||
    method.includes("credit card") ||
    method.includes("debit card") ||
    method.includes("amex") ||
    method.includes("american express") ||
    method.includes("naps")
  );
}

function isBankTransfer(payment) {
  const method = getPaymentMethod(payment);

  return (
    method.includes("bank") ||
    method.includes("transfer")
  );
}

/* ============================================================
   SERVICE HELPERS
============================================================ */

function getServicesForJob(jobServices, jobId) {
  return jobServices.filter(
    (service) =>
      String(service.job_id) === String(jobId)
  );
}

function getServiceAmount(services) {
  return services.reduce(
    (sum, service) => sum + number(service.price),
    0
  );
}

function getServiceNames(services) {
  return services
    .map(
      (service) =>
        service.service_name ||
        service.name ||
        service.title ||
        ""
    )
    .filter(Boolean)
    .join(", ");
}

/* ============================================================
   CANONICAL JOB CALCULATION
============================================================ */

function calculateJob(
  job,
  jobServices,
  paymentsByJob
) {
  const gross = number(job.price);
  const discount = number(job.discount);

  const jobNet = Math.max(
    gross - discount,
    0
  );

  const services = getServicesForJob(
    jobServices,
    job.id
  );

  const serviceTotal =
    getServiceAmount(services);

  const teyseer = isTeyseerJob(job);

  /*
    Teyseer:
    If services exist, all services become
    the canonical net amount.

    Otherwise use job.price - discount.
  */

  const canonicalNet =
    teyseer && services.length > 0
      ? serviceTotal
      : jobNet;

  const linkedPayments =
    paymentsByJob[String(job.id)] || [];

  const paid = linkedPayments.reduce(
    (sum, payment) =>
      sum + number(payment.amount),
    0
  );

  const balance =
    canonicalNet - paid;

  /*
    Detect difference between:
    job.price - discount
    and
    total services
  */

  const discrepancy =
    teyseer && services.length > 0
      ? serviceTotal - jobNet
      : 0;

  return {
    ...job,
    gross,
    discount,
    jobNet,
    services,
    serviceTotal,
    canonicalNet,
    paid,
    balance,
    discrepancy,
    isTeyseer: teyseer,
    serviceNames:
      getServiceNames(services),
  };
}

/* ============================================================
   COMPONENT
============================================================ */

function Reports() {
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [jobServices, setJobServices] =
    useState([]);

  const [manualPending, setManualPending] =
    useState(DEFAULT_PENDING);

  const [manualTeyseer, setManualTeyseer] =
    useState(DEFAULT_PREVIOUS_TEYSEER);

  const [savingSetting, setSavingSetting] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [reportDate, setReportDate] =
    useState(todayQatar());

  const [alnusoorStartDate, setAlnusoorStartDate] =
    useState("");

  const [alnusoorEndDate, setAlnusoorEndDate] =
    useState("");

  const [teyseerStartDate, setTeyseerStartDate] =
    useState("");

  const [teyseerEndDate, setTeyseerEndDate] =
    useState("");

  const [showDiscrepancies, setShowDiscrepancies] =
    useState(false);

  useEffect(() => {
    loadReports();
    loadReportSettings();
  }, []);

  /* ==========================================================
     LOAD DATA
  ========================================================== */

  async function loadReports() {
    try {
      setLoading(true);

      const [
        jobsResult,
        paymentsResult,
        servicesResult,
      ] = await Promise.all([
        supabase
          .from("jobs")
          .select("*"),

        supabase
          .from("payments")
          .select("*"),

        supabase
          .from("job_services")
          .select("*"),
      ]);

      if (jobsResult.error) {
        console.error(
          "JOBS ERROR:",
          jobsResult.error
        );
      }

      if (paymentsResult.error) {
        console.error(
          "PAYMENTS ERROR:",
          paymentsResult.error
        );
      }

      if (servicesResult.error) {
        console.error(
          "JOB SERVICES ERROR:",
          servicesResult.error
        );
      }

      setJobs(jobsResult.data || []);
      setPayments(
        paymentsResult.data || []
      );
      setJobServices(
        servicesResult.data || []
      );
    } catch (error) {
      console.error(
        "REPORT LOAD ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadReportSettings() {
    const { data, error } = await supabase
      .from("report_settings")
      .select("*");

    if (error) {
      console.error(
        "REPORT SETTINGS ERROR:",
        error
      );
      return;
    }

    if (!data) return;

    const june = data.find(
      (item) =>
        item.setting_name ===
        "June Pending"
    );

    const july = data.find(
      (item) =>
        item.setting_name ===
        "July Pending"
    );

    const august = data.find(
      (item) =>
        item.setting_name ===
        "August Pending"
    );

    const teyseer = data.find(
      (item) =>
        item.setting_name ===
        "Previous Teyseer"
    );

    setManualPending({
      June: june
        ? number(june.amount)
        : DEFAULT_PENDING.June,

      July: july
        ? number(july.amount)
        : DEFAULT_PENDING.July,

      August: august
        ? number(august.amount)
        : DEFAULT_PENDING.August,
    });

    if (teyseer) {
      setManualTeyseer(
        number(teyseer.amount)
      );
    }
  }

  async function saveSetting(
    settingName,
    amount
  ) {
    try {
      setSavingSetting(settingName);

      const numericAmount =
        number(amount);

      const {
        data: existing,
        error: findError,
      } = await supabase
        .from("report_settings")
        .select("*")
        .eq(
          "setting_name",
          settingName
        )
        .maybeSingle();

      if (findError) {
        console.error(
          "FIND SETTING ERROR:",
          findError
        );
        return;
      }

      if (existing) {
        const { error } =
          await supabase
            .from("report_settings")
            .update({
              amount: numericAmount,
            })
            .eq(
              "setting_name",
              settingName
            );

        if (error) {
          console.error(
            "UPDATE SETTING ERROR:",
            error
          );
        }
      } else {
        const { error } =
          await supabase
            .from("report_settings")
            .insert({
              setting_name: settingName,
              amount: numericAmount,
            });

        if (error) {
          console.error(
            "INSERT SETTING ERROR:",
            error
          );
        }
      }
    } finally {
      setSavingSetting("");
    }
  }

  function changePending(
    month,
    value
  ) {
    const amount = number(value);

    setManualPending((prev) => ({
      ...prev,
      [month]: amount,
    }));

    saveSetting(
      `${month} Pending`,
      amount
    );
  }

  function changeTeyseer(value) {
    const amount = number(value);

    setManualTeyseer(amount);

    saveSetting(
      "Previous Teyseer",
      amount
    );
  }

  /* ==========================================================
     PAYMENT MAP
  ========================================================== */

  const paymentsByJob = useMemo(() => {
    const map = {};

    payments.forEach((payment) => {
      const key = String(
        payment.job_id
      );

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(payment);
    });

    return map;
  }, [payments]);

  /* ==========================================================
     CANONICAL JOBS
  ========================================================== */

  const calculatedJobs = useMemo(() => {
    return jobs.map((job) =>
      calculateJob(
        job,
        jobServices,
        paymentsByJob
      )
    );
  }, [
    jobs,
    jobServices,
    paymentsByJob,
  ]);

  /* ==========================================================
     GENERAL FINANCIAL TOTALS
  ========================================================== */

  const financial = useMemo(() => {
    const grossSales =
      calculatedJobs.reduce(
        (sum, job) =>
          sum + job.gross,
        0
      );

    const discounts =
      calculatedJobs.reduce(
        (sum, job) =>
          sum + job.discount,
        0
      );

    const netSales =
      calculatedJobs.reduce(
        (sum, job) =>
          sum + job.canonicalNet,
        0
      );

    const paid =
      calculatedJobs.reduce(
        (sum, job) =>
          sum + job.paid,
        0
      );

    const balance =
      netSales - paid;

    const cashPaid =
      payments
        .filter(isCash)
        .reduce(
          (sum, payment) =>
            sum + number(payment.amount),
          0
        );

    const cardPaid =
      payments
        .filter(isCard)
        .reduce(
          (sum, payment) =>
            sum + number(payment.amount),
          0
        );

    const bankTransferPaid =
      payments
        .filter(isBankTransfer)
        .reduce(
          (sum, payment) =>
            sum + number(payment.amount),
          0
        );

    const otherPaid =
      payments
        .filter(
          (payment) =>
            !isCash(payment) &&
            !isCard(payment) &&
            !isBankTransfer(payment)
        )
        .reduce(
          (sum, payment) =>
            sum + number(payment.amount),
          0
        );

    return {
      grossSales,
      discounts,
      netSales,
      paid,
      balance,
      cashPaid,
      cardPaid,
      bankTransferPaid,
      otherPaid,
    };
  }, [
    calculatedJobs,
    payments,
  ]);

  /* ==========================================================
     TEYSEER
  ========================================================== */

  const teyseerJobs = useMemo(
    () =>
      calculatedJobs.filter(
        (job) =>
          job.isTeyseer &&
          job.canonicalNet > 0
      ),
    [calculatedJobs]
  );

  const customerJobs = useMemo(
    () =>
      calculatedJobs.filter(
        (job) => !job.isTeyseer
      ),
    [calculatedJobs]
  );

  const teyseerSales = useMemo(
    () =>
      teyseerJobs.reduce(
        (sum, job) =>
          sum + job.canonicalNet,
        0
      ),
    [teyseerJobs]
  );

  const teyseerPaid = useMemo(
    () =>
      teyseerJobs.reduce(
        (sum, job) =>
          sum + job.paid,
        0
      ),
    [teyseerJobs]
  );

  const teyseerBalance =
    teyseerSales - teyseerPaid;

  const customerSales = useMemo(
    () =>
      customerJobs.reduce(
        (sum, job) =>
          sum + job.canonicalNet,
        0
      ),
    [customerJobs]
  );

  const customerPaid = useMemo(
    () =>
      customerJobs.reduce(
        (sum, job) =>
          sum + job.paid,
        0
      ),
    [customerJobs]
  );

  const customerBalance =
    customerSales - customerPaid;

  /* ==========================================================
     TEYSEER BY SOURCE
  ========================================================== */

  const teyseerMotorsAmount =
    teyseerJobs
      .filter(
        (job) =>
          job.source ===
          "Teyseer Motors"
      )
      .reduce(
        (sum, job) =>
          sum + job.canonicalNet,
        0
      );

  const salahAmount =
    teyseerJobs
      .filter(
        (job) =>
          job.source ===
          "Teyseer Motors - Salah"
      )
      .reduce(
        (sum, job) =>
          sum + job.canonicalNet,
        0
      );

  const bahaaAmount =
    teyseerJobs
      .filter(
        (job) =>
          job.source ===
          "Teyseer Motors - Bahaa"
      )
      .reduce(
        (sum, job) =>
          sum + job.canonicalNet,
        0
      );

  /* ==========================================================
     DISCREPANCIES
  ========================================================== */

  const discrepancyJobs = useMemo(
    () =>
      teyseerJobs.filter(
        (job) =>
          Math.abs(
            job.discrepancy
          ) > 0.01
      ),
    [teyseerJobs]
  );

  const totalTeyseerDiscrepancy =
    discrepancyJobs.reduce(
      (sum, job) =>
        sum + job.discrepancy,
      0
    );

  /* ==========================================================
     DAILY PAYMENTS
  ========================================================== */

  const dailyPayments = useMemo(() => {
    const result = {};

    payments.forEach((payment) => {
      const date = String(
        payment.payment_date || ""
      ).slice(0, 10);

      if (!date) return;

      if (!result[date]) {
        result[date] = {
          cash: 0,
          visa: 0,
          mastercard: 0,
          bankTransfer: 0,
          other: 0,
          total: 0,
        };
      }

      const amount = number(
        payment.amount
      );

      const method =
        getPaymentMethod(payment);

      result[date].total += amount;

      if (isCash(payment)) {
        result[date].cash += amount;
      } else if (
        method.includes("visa")
      ) {
        result[date].visa += amount;
      } else if (
        method.includes("mastercard") ||
        method.includes("master card")
      ) {
        result[date].mastercard +=
          amount;
      } else if (
        isBankTransfer(payment)
      ) {
        result[date].bankTransfer +=
          amount;
      } else {
        result[date].other += amount;
      }
    });

    return Object.entries(result).sort(
      ([a], [b]) =>
        b.localeCompare(a)
    );
  }, [payments]);

  const selectedDatePayments =
    useMemo(
      () =>
        payments.filter((payment) => {
          if (!payment.payment_date) {
            return false;
          }

          return (
            String(
              payment.payment_date
            ).slice(0, 10) ===
            reportDate
          );
        }),
      [payments, reportDate]
    );

  const selectedDatePaymentTotal =
    selectedDatePayments.reduce(
      (sum, payment) =>
        sum + number(payment.amount),
      0
    );

  /* ==========================================================
     DAILY JOB REPORT
  ========================================================== */

  const selectedDateJobs =
    calculatedJobs.filter(
      (job) =>
        getJobDate(job) ===
        reportDate
    );

  const selectedDateSales =
    selectedDateJobs.reduce(
      (sum, job) =>
        sum + job.canonicalNet,
      0
    );

  const selectedDatePaid =
    selectedDateJobs.reduce(
      (sum, job) =>
        sum + job.paid,
      0
    );

  const selectedDateBalance =
    selectedDateSales -
    selectedDatePaid;

  /* ==========================================================
     CAR COUNTS
  ========================================================== */

  const today = todayQatar();

  const carsToday =
    calculatedJobs.filter(
      (job) =>
        getJobDate(job) === today
    ).length;

  const qatarNowString =
    new Date().toLocaleDateString(
      "en-CA",
      {
        timeZone: "Asia/Qatar",
      }
    );

  const currentMonth =
    qatarNowString.slice(0, 7);

  const carsThisMonth =
    calculatedJobs.filter((job) => {
      const date =
        getJobDate(job);

      return (
        date &&
        date.slice(0, 7) ===
          currentMonth
      );
    }).length;

  function isSameWeekQatar(
    dateString
  ) {
    if (!dateString) return false;

    const date = new Date(
      `${dateString}T12:00:00`
    );

    const todayDate = new Date(
      `${today}T12:00:00`
    );

    const day =
      todayDate.getDay();

    const mondayOffset =
      day === 0 ? 6 : day - 1;

    const monday =
      new Date(todayDate);

    monday.setDate(
      monday.getDate() -
        mondayOffset
    );

    monday.setHours(
      0,
      0,
      0,
      0
    );

    const sunday =
      new Date(monday);

    sunday.setDate(
      sunday.getDate() + 6
    );

    sunday.setHours(
      23,
      59,
      59,
      999
    );

    return (
      date >= monday &&
      date <= sunday
    );
  }

  const carsThisWeek =
    calculatedJobs.filter(
      (job) =>
        isSameWeekQatar(
          getJobDate(job)
        )
    ).length;

  /* ==========================================================
     DAILY CARS
  ========================================================== */

  const dailyCars = {};

  calculatedJobs.forEach((job) => {
    const date =
      getJobDate(job);

    if (!date) return;

    dailyCars[date] =
      (dailyCars[date] || 0) + 1;
  });

  const dailyCarRows =
    Object.entries(
      dailyCars
    ).sort(
      ([a], [b]) =>
        b.localeCompare(a)
    );

  /* ==========================================================
     AL NUSOOR
  ========================================================== */

  const alnusoorJobs =
    calculatedJobs.filter(
      (job) => {
        const customer =
          String(
            job.customer || ""
          )
            .toLowerCase()
            .trim();

        const isAlnusoor =
          customer.includes(
            "al nusoor"
          ) ||
          customer.includes(
            "alnusoor"
          );

        if (!isAlnusoor) {
          return false;
        }

        return isDateInRange(
          getJobDate(job),
          alnusoorStartDate,
          alnusoorEndDate
        );
      }
    );

  const alnusoorGross =
    alnusoorJobs.reduce(
      (sum, job) =>
        sum + job.gross,
      0
    );

  const alnusoorDiscount =
    alnusoorJobs.reduce(
      (sum, job) =>
        sum + job.discount,
      0
    );

  const alnusoorNet =
    alnusoorJobs.reduce(
      (sum, job) =>
        sum + job.canonicalNet,
      0
    );

  const alnusoorPaid =
    alnusoorJobs.reduce(
      (sum, job) =>
        sum + job.paid,
      0
    );

  const alnusoorBalance =
    alnusoorNet -
    alnusoorPaid;

  /* ==========================================================
     FILTERED TEYSEER
  ========================================================== */

  const filteredTeyseerJobs =
    teyseerJobs.filter(
      (job) =>
        isDateInRange(
          getJobDate(job),
          teyseerStartDate,
          teyseerEndDate
        )
    );

  const filteredTeyseerSales =
    filteredTeyseerJobs.reduce(
      (sum, job) =>
        sum + job.canonicalNet,
      0
    );

  const filteredTeyseerPaid =
    filteredTeyseerJobs.reduce(
      (sum, job) =>
        sum + job.paid,
      0
    );

  const filteredTeyseerBalance =
    filteredTeyseerSales -
    filteredTeyseerPaid;

  /* ==========================================================
     PRINT AL NUSOOR REPORT
  ========================================================== */

  function printAlnusoorReport() {
    if (
      alnusoorJobs.length === 0
    ) {
      alert(
        "No Al Nusoor jobs found."
      );
      return;
    }

    const rows =
      alnusoorJobs
        .map(
          (job) => `
            <tr>
              <td>${getJobDate(job) || "-"}</td>
              <td>${escapeHtml(
                job.customer || "-"
              )}</td>
              <td>${escapeHtml(
                job.carMake ||
                  job.carType ||
                  job.carModel ||
                  "-"
              )}</td>
              <td>${escapeHtml(
                job.plate || "-"
              )}</td>
              <td class="money">${money(
                job.gross
              )}</td>
              <td class="money">${money(
                job.discount
              )}</td>
              <td class="money">${money(
                job.canonicalNet
              )}</td>
              <td class="money">${money(
                job.paid
              )}</td>
              <td class="money">${money(
                job.balance
              )}</td>
            </tr>
          `
        )
        .join("");

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=1000"
      );

    if (!printWindow) {
      alert(
        "Please allow pop-ups for this website."
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Al Nusoor Center Report</title>

        <style>
          * {
            box-sizing: border-box;
          }

          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body {
            font-family: Arial, sans-serif;
            color: #000;
            font-size: 10px;
            margin: 0;
            padding: 10px;
          }

          .header {
            display: flex;
            gap: 18px;
            margin-bottom: 25px;
          }

          .logo {
            width: 95px;
            height: 95px;
            object-fit: contain;
          }

          .companyName {
            font-size: 17px;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .arabicName {
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .address {
            font-size: 11px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            text-align: left;
            padding: 7px;
            background: #111827;
            color: white;
          }

          td {
            padding: 7px;
            border-bottom: 1px solid #ddd;
          }

          .money {
            text-align: right;
          }

          .summary {
            margin-top: 20px;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
          }

          .box {
            border: 1px solid #ccc;
            padding: 10px;
          }

          .label {
            font-size: 9px;
            color: #666;
          }

          .value {
            font-size: 14px;
            font-weight: bold;
            margin-top: 5px;
          }

          .footer {
            margin-top: 40px;
            border-top: 1px solid #000;
            padding-top: 10px;
            text-align: center;
            font-size: 8px;
          }
        </style>
      </head>

      <body>

        <div class="header">
          <img
            src="${gaLogo}"
            class="logo"
          />

          <div>
            <div class="companyName">
              HAOSHENG CAR SERVICE AND ACCESSORIES
            </div>

            <div class="arabicName">
              هاوشنغ لخدمات وزينة السيارات
            </div>

            <div class="address">
              Building 358, Salwa Road, Doha - Qatar
            </div>
          </div>
        </div>

        <h2>
          AL NUSOOR CENTER REPORT
        </h2>

        <p>
          Period:
          ${alnusoorStartDate || "All dates"}
          -
          ${alnusoorEndDate || "All dates"}
        </p>

        <table>
          <thead>
            <tr>
              <th>DATE</th>
              <th>CUSTOMER</th>
              <th>CAR</th>
              <th>PLATE</th>
              <th>GROSS</th>
              <th>DISCOUNT</th>
              <th>NET</th>
              <th>PAID</th>
              <th>BALANCE</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="summary">

          <div class="box">
            <div class="label">
              CARS
            </div>

            <div class="value">
              ${alnusoorJobs.length}
            </div>
          </div>

          <div class="box">
            <div class="label">
              GROSS
            </div>

            <div class="value">
              QAR ${money(
                alnusoorGross
              )}
            </div>
          </div>

          <div class="box">
            <div class="label">
              DISCOUNT
            </div>

            <div class="value">
              QAR ${money(
                alnusoorDiscount
              )}
            </div>
          </div>

          <div class="box">
            <div class="label">
              NET
            </div>

            <div class="value">
              QAR ${money(
                alnusoorNet
              )}
            </div>
          </div>

          <div class="box">
            <div class="label">
              BALANCE
            </div>

            <div class="value">
              QAR ${money(
                alnusoorBalance
              )}
            </div>
          </div>

        </div>

        <div class="footer">
          <strong>
            Tel: +974 4441 5866 |
            C.R.NO: 199725 |
            E-mail: info@haoshengcar.com
          </strong>

          <br />

          Fereej Al Manaseer,
          Zone 55, St. 340,
          Bldg 358, Salwa Road,
          Doha, Qatar
        </div>

      </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  }

  /* ==========================================================
     PRINT TEYSEER REPORT
  ========================================================== */

  function printTeyseerReport() {
    if (
      filteredTeyseerJobs.length === 0
    ) {
      alert(
        "No Teyseer jobs found."
      );
      return;
    }

    const rows =
      filteredTeyseerJobs
        .map(
          (job, index) => `
            <tr>
              <td>${index + 1}</td>

              <td>
                ${getJobDate(job) || "-"}
              </td>

              <td>
                ${escapeHtml(
                  job.source || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  job.carMake ||
                    job.carType ||
                    job.carModel ||
                    "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  job.plate || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  job.serviceNames ||
                    "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  job.voucherNumber ||
                    "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  job.receipt_number ||
                    "-"
                )}
              </td>

              <td class="money">
                QAR ${money(
                  job.canonicalNet
                )}
              </td>
            </tr>
          `
        )
        .join("");

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1500,height=1000"
      );

    if (!printWindow) {
      alert(
        "Please allow pop-ups for this website."
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>

      <head>
        <title>
          Teyseer Motors Report
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body {
            font-family: Arial, sans-serif;
            color: #000;
            margin: 0;
            padding: 15px;
            font-size: 9px;
          }

          .header {
            display: flex;
            width: 100%;
            min-height: 100px;
            margin-bottom: 15px;
          }

          .logo {
            width: 100px;
            height: 90px;
            object-fit: contain;
          }

          .company {
            padding-left: 20px;
          }

          .companyName {
            font-size: 17px;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .arabicName {
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 8px;
          }

          .reportTitle {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 6px;
          }

          .period {
            margin-bottom: 15px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            background: #111827;
            color: white;
            padding: 6px;
            text-align: left;
          }

          td {
            padding: 6px;
            border: 1px solid #ddd;
            vertical-align: top;
          }

          .money {
            text-align: right;
            white-space: nowrap;
          }

          .summary {
            display: flex;
            gap: 10px;
            margin: 15px 0;
          }

          .box {
            border: 1px solid #999;
            padding: 8px;
            min-width: 150px;
          }

          .boxLabel {
            font-size: 8px;
            color: #666;
          }

          .boxValue {
            font-size: 13px;
            font-weight: bold;
            margin-top: 4px;
          }

          .footer {
            margin-top: 35px;
            border-top: 1px solid #000;
            padding-top: 8px;
            text-align: center;
            font-size: 8px;
          }

          @media print {
            thead {
              display: table-header-group;
            }

            tr {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>

        <div class="header">

          <img
            src="${gaLogo}"
            class="logo"
          />

          <div class="company">

            <div class="companyName">
              HAOSHENG CAR SERVICE AND ACCESSORIES
            </div>

            <div class="arabicName">
              هاوشنغ لخدمات وزينة السيارات
            </div>

            <div>
              Building 358,
              Salwa Road,
              Doha - Qatar
            </div>

          </div>
        </div>

        <div class="reportTitle">
          TEYSEER MOTORS REPORT
        </div>

        <div class="period">
          Period:
          ${teyseerStartDate || "All dates"}
          -
          ${teyseerEndDate || "All dates"}
        </div>

        <div class="summary">

          <div class="box">
            <div class="boxLabel">
              TEYSEER CARS
            </div>

            <div class="boxValue">
              ${filteredTeyseerJobs.length}
            </div>
          </div>

          <div class="box">
            <div class="boxLabel">
              NET AMOUNT
            </div>

            <div class="boxValue">
              QAR ${money(
                filteredTeyseerSales
              )}
            </div>
          </div>

          <div class="box">
            <div class="boxLabel">
              PAID
            </div>

            <div class="boxValue">
              QAR ${money(
                filteredTeyseerPaid
              )}
            </div>
          </div>

          <div class="box">
            <div class="boxLabel">
              BALANCE
            </div>

            <div class="boxValue">
              QAR ${money(
                filteredTeyseerBalance
              )}
            </div>
          </div>

        </div>

        <table>

          <thead>
            <tr>
              <th>#</th>
              <th>DATE</th>
              <th>SOURCE</th>
              <th>CAR</th>
              <th>PLATE</th>
              <th>ALL SERVICES</th>
              <th>VOUCHER NO.</th>
              <th>RECEIPT NO.</th>
              <th>NET AMOUNT</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>

        </table>

        <div class="footer">

          Tel: +974 4441 5866 |
          C.R.NO: 199725 |
          E-mail: info@haoshengcar.com

          <br />

          Fereej Al Manaseer,
          Zone 55, St. 340,
          Bldg 358, Salwa Road,
          Doha, Qatar

        </div>

      </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  }

  /* ==========================================================
     PRINT DAILY REPORT
  ========================================================== */

  function printDailyReport() {
    const jobsForDay =
      selectedDateJobs;

    const paymentsForDay =
      selectedDatePayments;

    if (
      jobsForDay.length === 0 &&
      paymentsForDay.length === 0
    ) {
      alert(
        `No cars or payments found for ${reportDate}.`
      );
      return;
    }

    const jobRows =
      jobsForDay
        .map(
          (job, index) => `
            <tr>

              <td>
                ${index + 1}
              </td>

              <td>
                ${escapeHtml(
                  job.customer || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  job.phone || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  job.carModel || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  job.plate || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  job.source || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  job.serviceNames ||
                    "-"
                )}
              </td>

              <td class="money">
                QAR ${money(
                  job.gross
                )}
              </td>

              <td class="money">
                QAR ${money(
                  job.discount
                )}
              </td>

              <td class="money">
                QAR ${money(
                  job.canonicalNet
                )}
              </td>

              <td class="money">
                QAR ${money(
                  job.paid
                )}
              </td>

              <td class="money">
                QAR ${money(
                  job.balance
                )}
              </td>

            </tr>
          `
        )
        .join("");

    const paymentRows =
      paymentsForDay
        .map(
          (payment) => `
            <tr>

              <td>
                ${escapeHtml(
                  payment.payment_date ||
                    ""
                )}
              </td>

              <td>
                ${escapeHtml(
                  payment.payment_method ||
                    payment.method ||
                    payment.type ||
                    "Unknown"
                )}
              </td>

              <td class="money">
                QAR ${money(
                  payment.amount
                )}
              </td>

            </tr>
          `
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

          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body {
            font-family: Arial, sans-serif;
            color: #111827;
            padding: 10px;
            margin: 0;
          }

          h1 {
            margin: 0;
          }

          .date {
            color: #64748b;
            margin: 5px 0 20px;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 25px;
          }

          .box {
            border: 1px solid #ddd;
            padding: 12px;
            background: #f8fafc;
          }

          .label {
            color: #64748b;
            font-size: 10px;
          }

          .value {
            font-size: 18px;
            font-weight: bold;
            margin-top: 5px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }

          th {
            background: #111827;
            color: white;
            padding: 7px;
            text-align: left;
          }

          td {
            padding: 6px;
            border: 1px solid #ddd;
          }

          .money {
            text-align: right;
            white-space: nowrap;
          }

        </style>

      </head>

      <body>

        <h1>
          Daily Workshop Report
        </h1>

        <div class="date">
          Date: ${reportDate}
        </div>

        <div class="summary">

          <div class="box">

            <div class="label">
              TOTAL CARS
            </div>

            <div class="value">
              ${jobsForDay.length}
            </div>

          </div>

          <div class="box">

            <div class="label">
              NET SALES
            </div>

            <div class="value">
              QAR ${money(
                selectedDateSales
              )}
            </div>

          </div>

          <div class="box">

            <div class="label">
              PAYMENTS TODAY
            </div>

            <div class="value">
              QAR ${money(
                selectedDatePaymentTotal
              )}
            </div>

          </div>

          <div class="box">

            <div class="label">
              BALANCE DUE
            </div>

            <div class="value">
              QAR ${money(
                selectedDateBalance
              )}
            </div>

          </div>

        </div>

        <h2>
          Cars
        </h2>

        <table>

          <thead>

            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Car</th>
              <th>Plate</th>
              <th>Source</th>
              <th>Services</th>
              <th>Gross</th>
              <th>Discount</th>
              <th>Net</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>

          </thead>

          <tbody>
            ${jobRows}
          </tbody>

        </table>

        <h2>
          Payments Received
        </h2>

        <table>

          <thead>

            <tr>
              <th>Date</th>
              <th>Payment Method</th>
              <th>Amount</th>
            </tr>

          </thead>

          <tbody>
            ${paymentRows}
          </tbody>

        </table>

      </body>

      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  }

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div
        style={{
          padding: "40px",
          background: "#f1f5f9",
          minHeight: "100vh",
        }}
      >
        <h1>
          Reports
        </h1>

        <p>
          Loading report data...
        </p>
      </div>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div
      style={{
        padding: "30px",
        background: "#f1f5f9",
        minHeight: "100vh",
      }}
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "15px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >

        <div>

          <h1
            style={{
              marginBottom: "5px",
            }}
          >
            Reports
          </h1>

          <p
            style={{
              color: "#64748b",
              margin: 0,
            }}
          >
            All amounts use the same
            canonical calculation.
          </p>

        </div>

        <button
          onClick={loadReports}
          style={darkButton}
        >
          Refresh Data
        </button>

      </div>

      {/* =====================================================
          REPORT DATE
      ===================================================== */}

      <div
        style={{
          ...whiteCardStyle,
          display: "flex",
          alignItems: "end",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >

        <div>

          <label style={labelStyle}>
            Report Date
          </label>

          <input
            type="date"
            value={reportDate}
            onChange={(e) =>
              setReportDate(
                e.target.value
              )
            }
            style={inputStyle}
          />

        </div>

        <button
          onClick={printDailyReport}
          style={darkButton}
        >
          Print Daily Report
        </button>

      </div>

      {/* =====================================================
          FINANCIAL SUMMARY
      ===================================================== */}

      <h2>
        Financial Summary
      </h2>

      <div style={gridStyle}>

        <FinancialCard
          title="Gross Sales"
          value={financial.grossSales}
          color="#0f172a"
          icon="💰"
        />

        <FinancialCard
          title="Total Discount"
          value={financial.discounts}
          color="#f59e0b"
          icon="🏷️"
        />

        <FinancialCard
          title="Net Sales"
          value={financial.netSales}
          color="#0891b2"
          icon="📊"
        />

        <FinancialCard
          title="Total Paid"
          value={financial.paid}
          color="#16a34a"
          icon="💳"
        />

        <FinancialCard
          title="Total Balance"
          value={financial.balance}
          color="#dc2626"
          icon="⚠️"
        />

      </div>

      {/* =====================================================
          TEYSEER / CUSTOMER
      ===================================================== */}

      <h2>
        Sales Breakdown
      </h2>

      <div style={gridStyle}>

        <FinancialCard
          title="Teyseer Net Sales"
          value={teyseerSales}
          color="#9333ea"
          icon="🏢"
        />

        <FinancialCard
          title="Teyseer Paid"
          value={teyseerPaid}
          color="#16a34a"
          icon="💳"
        />

        <FinancialCard
          title="Teyseer Balance"
          value={teyseerBalance}
          color="#dc2626"
          icon="⚠️"
        />

        <FinancialCard
          title="Customers / Other Sales"
          value={customerSales}
          color="#0891b2"
          icon="👥"
        />

        <FinancialCard
          title="Customers Paid"
          value={customerPaid}
          color="#16a34a"
          icon="💳"
        />

        <FinancialCard
          title="Customers Balance"
          value={customerBalance}
          color="#dc2626"
          icon="⚠️"
        />

      </div>

      {/* =====================================================
          PAYMENT METHODS
      ===================================================== */}

      <h2>
        Payment Methods
      </h2>

      <div style={gridStyle}>

        <FinancialCard
          title="Cash"
          value={financial.cashPaid}
          color="#16a34a"
          icon="💵"
        />

        <FinancialCard
          title="Card"
          value={financial.cardPaid}
          color="#2563eb"
          icon="💳"
        />

        <FinancialCard
          title="Bank Transfer"
          value={financial.bankTransferPaid}
          color="#7c3aed"
          icon="🏦"
        />

        <FinancialCard
          title="Other"
          value={financial.otherPaid}
          color="#64748b"
          icon="💰"
        />

      </div>

      {/* =====================================================
          DAILY PAYMENTS
      ===================================================== */}

      <h2>
        Daily Payments
      </h2>

      <div style={whiteCardStyle}>

        <h3>
          Payments on {reportDate}
        </h3>

        <h1
          style={{
            color: "#16a34a",
          }}
        >
          QAR{" "}
          {wholeMoney(
            selectedDatePaymentTotal
          )}
        </h1>

        <p>
          {selectedDatePayments.length}{" "}
          payment
          {selectedDatePayments.length ===
          1
            ? ""
            : "s"}{" "}
          received
        </p>

      </div>

      <div style={whiteCardStyle}>

        {dailyPayments.length === 0 ? (
          <p>
            No payment records found.
          </p>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >

            <table
              style={tableStyle}
            >

              <thead>

                <tr>

                  <th
                    style={tableHeader}
                  >
                    Date
                  </th>

                  <th
                    style={tableHeader}
                  >
                    Cash
                  </th>

                  <th
                    style={tableHeader}
                  >
                    Visa
                  </th>

                  <th
                    style={tableHeader}
                  >
                    Mastercard
                  </th>

                  <th
                    style={tableHeader}
                  >
                    Bank Transfer
                  </th>

                  <th
                    style={tableHeader}
                  >
                    Other
                  </th>

                  <th
                    style={tableHeader}
                  >
                    Total
                  </th>

                </tr>

              </thead>

              <tbody>

                {dailyPayments.map(
                  ([date, values]) => (
                    <tr key={date}>

                      <td
                        style={tableCell}
                      >
                        {date}
                      </td>

                      <td
                        style={tableCell}
                      >
                        QAR{" "}
                        {wholeMoney(
                          values.cash
                        )}
                      </td>

                      <td
                        style={tableCell}
                      >
                        QAR{" "}
                        {wholeMoney(
                          values.visa
                        )}
                      </td>

                      <td
                        style={tableCell}
                      >
                        QAR{" "}
                        {wholeMoney(
                          values.mastercard
                        )}
                      </td>

                      <td
                        style={tableCell}
                      >
                        QAR{" "}
                        {wholeMoney(
                          values.bankTransfer
                        )}
                      </td>

                      <td
                        style={tableCell}
                      >
                        QAR{" "}
                        {wholeMoney(
                          values.other
                        )}
                      </td>

                      <td
                        style={{
                          ...tableCell,
                          fontWeight:
                            "bold",
                          color:
                            "#16a34a",
                        }}
                      >
                        QAR{" "}
                        {wholeMoney(
                          values.total
                        )}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* =====================================================
          PREVIOUS MONTH PENDING
      ===================================================== */}

      <h2>
        Previous Month Pending
      </h2>

      <div style={gridStyle}>

        <ManualCard
          title="June Pending"
          value={
            manualPending.June
          }
          saving={
            savingSetting ===
            "June Pending"
          }
          onChange={(value) =>
            changePending(
              "June",
              value
            )
          }
        />

        <ManualCard
          title="July Pending"
          value={
            manualPending.July
          }
          saving={
            savingSetting ===
            "July Pending"
          }
          onChange={(value) =>
            changePending(
              "July",
              value
            )
          }
        />

        <ManualCard
          title="August Pending"
          value={
            manualPending.August
          }
          saving={
            savingSetting ===
            "August Pending"
          }
          onChange={(value) =>
            changePending(
              "August",
              value
            )
          }
        />

      </div>

      {/* =====================================================
          PREVIOUS TEYSEER
      ===================================================== */}

      <h2>
        Previous Teyseer
      </h2>

      <div style={whiteCardStyle}>

        <h3>
          Previous Teyseer Amount
        </h3>

        <input
          type="number"
          value={manualTeyseer}
          onChange={(e) =>
            changeTeyseer(
              e.target.value
            )
          }
          style={{
            ...inputStyle,
            width: "350px",
            maxWidth: "100%",
          }}
        />

        {savingSetting ===
          "Previous Teyseer" && (
          <p
            style={{
              color: "#16a34a",
            }}
          >
            Saving...
          </p>
        )}

        <h2
          style={{
            color: "#9333ea",
          }}
        >
          QAR{" "}
          {wholeMoney(
            manualTeyseer
          )}
        </h2>

      </div>

      {/* =====================================================
          CAR REPORTS
      ===================================================== */}

      <h2>
        Car Reports
      </h2>

      <div style={gridStyle}>

        <FinancialCard
          title="Total Cars"
          value={
            calculatedJobs.length
          }
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

      {/* =====================================================
          DAILY CARS
      ===================================================== */}

      <h2>
        Cars Received Per Day
      </h2>

      <div style={whiteCardStyle}>

        {dailyCarRows.length ===
        0 ? (
          <p>
            No car records found.
          </p>
        ) : (
          <table
            style={tableStyle}
          >

            <thead>

              <tr>

                <th
                  style={tableHeader}
                >
                  Date
                </th>

                <th
                  style={tableHeader}
                >
                  Cars Received
                </th>

              </tr>

            </thead>

            <tbody>

              {dailyCarRows.map(
                ([date, count]) => (
                  <tr key={date}>

                    <td
                      style={tableCell}
                    >
                      {date}
                    </td>

                    <td
                      style={tableCell}
                    >
                      🚗 {count}
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>
        )}

      </div>

      {/* =====================================================
          SOURCE REPORTS
      ===================================================== */}

      <h2>
        Source Reports
      </h2>

      <div style={gridStyle}>

        <div
          style={sourceCardStyle}
        >

          <h2>
            Teyseer
          </h2>

          <p>
            Cars:{" "}
            <strong>
              {teyseerJobs.length}
            </strong>
          </p>

          <p>
            Teyseer Total Sales:
            <strong>
              {" "}
              QAR{" "}
              {wholeMoney(
                teyseerSales
              )}
            </strong>
          </p>

          <p>
            Teyseer Motors:
            <strong>
              {" "}
              QAR{" "}
              {wholeMoney(
                teyseerMotorsAmount
              )}
            </strong>
          </p>

          <p>
            Teyseer - Salah:
            <strong>
              {" "}
              QAR{" "}
              {wholeMoney(
                salahAmount
              )}
            </strong>
          </p>

          <p>
            Teyseer - Bahaa:
            <strong>
              {" "}
              QAR{" "}
              {wholeMoney(
                bahaaAmount
              )}
            </strong>
          </p>

        </div>

        <div
          style={sourceCardStyle}
        >

          <h2>
            Salah / Bahaa
          </h2>

          <p>
            Salah Total:
            <strong>
              {" "}
              QAR{" "}
              {wholeMoney(
                salahAmount
              )}
            </strong>
          </p>

          <p>
            Bahaa Total:
            <strong>
              {" "}
              QAR{" "}
              {wholeMoney(
                bahaaAmount
              )}
            </strong>
          </p>

          <p
            style={{
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            All services belonging
            to Teyseer-Salah and
            Teyseer-Bahaa are
            included.
          </p>

        </div>

        <div
          style={sourceCardStyle}
        >

          <h2>
            Customers / Other
          </h2>

          <p>
            Cars:
            <strong>
              {" "}
              {customerJobs.length}
            </strong>
          </p>

          <p>
            Net Sales:
            <strong>
              {" "}
              QAR{" "}
              {wholeMoney(
                customerSales
              )}
            </strong>
          </p>

          <p>
            Paid:
            <strong>
              {" "}
              QAR{" "}
              {wholeMoney(
                customerPaid
              )}
            </strong>
          </p>

          <p>
            Balance:
            <strong>
              {" "}
              QAR{" "}
              {wholeMoney(
                customerBalance
              )}
            </strong>
          </p>

        </div>

      </div>

      {/* =====================================================
          DATA CONSISTENCY CHECK
      ===================================================== */}

      <div
        style={{
          ...whiteCardStyle,
          borderTop:
            "5px solid #f59e0b",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >

          <div>

            <h2
              style={{
                marginTop: 0,
              }}
            >
              Teyseer Calculation
              Check
            </h2>

            <p
              style={{
                color: "#64748b",
              }}
            >
              This detects cases where
              the job price/discount
              does not equal the sum
              of its services.
            </p>

          </div>

          <button
            onClick={() =>
              setShowDiscrepancies(
                (prev) => !prev
              )
            }
            style={{
              ...darkButton,
              background:
                discrepancyJobs.length >
                0
                  ? "#dc2626"
                  : "#16a34a",
            }}
          >
            {discrepancyJobs.length >
            0
              ? `${discrepancyJobs.length} Difference(s)`
              : "No Differences"}
          </button>

        </div>

        {discrepancyJobs.length >
          0 &&
          showDiscrepancies && (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >

              <table
                style={tableStyle}
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
                      Source
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Customer
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Job Net
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Services
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Difference
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {discrepancyJobs.map(
                    (job) => (
                      <tr
                        key={job.id}
                      >

                        <td
                          style={
                            tableCell
                          }
                        >
                          {getJobDate(
                            job
                          ) || "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {job.source ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {job.customer ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          QAR{" "}
                          {money(
                            job.jobNet
                          )}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          QAR{" "}
                          {money(
                            job.serviceTotal
                          )}
                        </td>

                        <td
                          style={{
                            ...tableCell,
                            color:
                              job.discrepancy >
                              0
                                ? "#dc2626"
                                : "#2563eb",
                            fontWeight:
                              "bold",
                          }}
                        >
                          QAR{" "}
                          {money(
                            job.discrepancy
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

              <div
                style={{
                  marginTop:
                    "15px",
                  fontWeight:
                    "bold",
                }}
              >
                Total Teyseer
                discrepancy:
                {" "}
                QAR{" "}
                {money(
                  totalTeyseerDiscrepancy
                )}
              </div>

            </div>
          )}

      </div>

      {/* =====================================================
          AL NUSOOR + TEYSEER REPORTS
      ===================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(400px,1fr))",
          gap: "25px",
          marginBottom: "30px",
        }}
      >

        {/* ===================================================
            AL NUSOOR
        =================================================== */}

        <div
          style={{
            ...whiteCardStyle,
            borderTop:
              "5px solid #d4af37",
          }}
        >

          <h2>
            Al Nusoor Report
          </h2>

          <p
            style={{
              color: "#64748b",
            }}
          >
            Al Nusoor is detected
            automatically from the
            Customer field.
          </p>

          <div
            style={filterStyle}
          >

            <div>

              <label
                style={labelStyle}
              >
                From Date
              </label>

              <input
                type="date"
                value={
                  alnusoorStartDate
                }
                onChange={(e) =>
                  setAlnusoorStartDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />

            </div>

            <div>

              <label
                style={labelStyle}
              >
                To Date
              </label>

              <input
                type="date"
                value={
                  alnusoorEndDate
                }
                onChange={(e) =>
                  setAlnusoorEndDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />

            </div>

          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom:
                "20px",
            }}
          >

            <button
              onClick={
                printAlnusoorReport
              }
              style={darkButton}
            >
              Print Al Nusoor
            </button>

            <button
              onClick={() => {
                setAlnusoorStartDate(
                  ""
                );
                setAlnusoorEndDate(
                  ""
                );
              }}
              style={clearButton}
            >
              Clear
            </button>

          </div>

          <div
            style={miniGrid}
          >

            <MiniBox
              title="Cars"
              value={
                alnusoorJobs.length
              }
            />

            <MiniBox
              title="Gross"
              value={`QAR ${wholeMoney(
                alnusoorGross
              )}`}
            />

            <MiniBox
              title="Discount"
              value={`QAR ${wholeMoney(
                alnusoorDiscount
              )}`}
            />

            <MiniBox
              title="Net"
              value={`QAR ${wholeMoney(
                alnusoorNet
              )}`}
            />

            <MiniBox
              title="Paid"
              value={`QAR ${wholeMoney(
                alnusoorPaid
              )}`}
            />

            <MiniBox
              title="Balance"
              value={`QAR ${wholeMoney(
                alnusoorBalance
              )}`}
            />

          </div>

          {alnusoorJobs.length ===
          0 ? (
            <p>
              No Al Nusoor jobs
              found.
            </p>
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >

              <table
                style={tableStyle}
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
                      Customer
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Car
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Plate
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Net
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Paid
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Balance
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {alnusoorJobs.map(
                    (job) => (
                      <tr
                        key={job.id}
                      >

                        <td
                          style={
                            tableCell
                          }
                        >
                          {getJobDate(
                            job
                          ) || "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {job.customer ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {job.carMake ||
                            job.carType ||
                            job.carModel ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {job.plate ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          QAR{" "}
                          {wholeMoney(
                            job.canonicalNet
                          )}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          QAR{" "}
                          {wholeMoney(
                            job.paid
                          )}
                        </td>

                        <td
                          style={{
                            ...tableCell,
                            fontWeight:
                              "bold",
                          }}
                        >
                          QAR{" "}
                          {wholeMoney(
                            job.balance
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* ===================================================
            TEYSEER
        =================================================== */}

        <div
          style={{
            ...whiteCardStyle,
            borderTop:
              "5px solid #9333ea",
          }}
        >

          <h2>
            Teyseer Report
          </h2>

          <p
            style={{
              color: "#64748b",
            }}
          >
            Teyseer Motors,
            Teyseer-Salah and
            Teyseer-Bahaa include
            the complete value of
            all services.
          </p>

          <div
            style={filterStyle}
          >

            <div>

              <label
                style={labelStyle}
              >
                From Date
              </label>

              <input
                type="date"
                value={
                  teyseerStartDate
                }
                onChange={(e) =>
                  setTeyseerStartDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />

            </div>

            <div>

              <label
                style={labelStyle}
              >
                To Date
              </label>

              <input
                type="date"
                value={
                  teyseerEndDate
                }
                onChange={(e) =>
                  setTeyseerEndDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />

            </div>

          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom:
                "20px",
            }}
          >

            <button
              onClick={
                printTeyseerReport
              }
              style={{
                ...darkButton,
                background:
                  "#9333ea",
              }}
            >
              Print Teyseer
            </button>

            <button
              onClick={() => {
                setTeyseerStartDate(
                  ""
                );
                setTeyseerEndDate(
                  ""
                );
              }}
              style={clearButton}
            >
              Clear
            </button>

          </div>

          <div
            style={miniGrid}
          >

            <MiniBox
              title="Cars"
              value={
                filteredTeyseerJobs.length
              }
            />

            <MiniBox
              title="Net Amount"
              value={`QAR ${wholeMoney(
                filteredTeyseerSales
              )}`}
            />

            <MiniBox
              title="Paid"
              value={`QAR ${wholeMoney(
                filteredTeyseerPaid
              )}`}
            />

            <MiniBox
              title="Balance"
              value={`QAR ${wholeMoney(
                filteredTeyseerBalance
              )}`}
            />

          </div>

          {filteredTeyseerJobs.length ===
          0 ? (
            <p>
              No Teyseer jobs
              found.
            </p>
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >

              <table
                style={tableStyle}
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
                      Source
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Car
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Plate
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      All Services
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Voucher
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Receipt
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Net
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Paid
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Balance
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredTeyseerJobs.map(
                    (job) => (
                      <tr
                        key={job.id}
                      >

                        <td
                          style={
                            tableCell
                          }
                        >
                          {getJobDate(
                            job
                          ) || "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {job.source ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {job.carMake ||
                            job.carType ||
                            job.carModel ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {job.plate ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {job.serviceNames ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {job.voucherNumber ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {job.receipt_number ||
                            "-"}
                        </td>

                        <td
                          style={{
                            ...tableCell,
                            fontWeight:
                              "bold",
                          }}
                        >
                          QAR{" "}
                          {wholeMoney(
                            job.canonicalNet
                          )}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          QAR{" "}
                          {wholeMoney(
                            job.paid
                          )}
                        </td>

                        <td
                          style={{
                            ...tableCell,
                            fontWeight:
                              "bold",
                          }}
                        >
                          QAR{" "}
                          {wholeMoney(
                            job.balance
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

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
        }}
      >
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <h2>
        {noCurrency
          ? Number(value).toLocaleString()
          : `QAR ${wholeMoney(value)}`}
      </h2>

    </div>
  );
}

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

      <input
        type="number"
        value={value}
        onChange={(e) =>
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
          borderRadius: "8px",
        }}
      />

      {saving && (
        <div
          style={{
            color: "#16a34a",
            marginTop: "8px",
          }}
        >
          Saving...
        </div>
      )}

      <h2
        style={{
          color: "#dc2626",
        }}
      >
        QAR{" "}
        {wholeMoney(value)}
      </h2>

    </div>
  );
}

function MiniBox({
  title,
  value,
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        padding: "15px",
        borderRadius: "10px",
        border:
          "1px solid #e2e8f0",
      }}
    >

      <div
        style={{
          color: "#64748b",
          fontSize: "12px",
        }}
      >
        {title}
      </div>

      <h3>
        {value}
      </h3>

    </div>
  );
}

/* ============================================================
   HTML ESCAPING FOR PRINT WINDOWS
============================================================ */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

/* ============================================================
   STYLES
============================================================ */

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: "20px",
  marginBottom: "30px",
};

const miniGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(130px,1fr))",
  gap: "10px",
  marginBottom: "20px",
};

const whiteCardStyle = {
  background: "white",
  padding: "25px",
  borderRadius: "18px",
  boxShadow:
    "0 8px 20px rgba(0,0,0,0.08)",
  marginBottom: "30px",
};

const sourceCardStyle = {
  background: "white",
  padding: "25px",
  borderRadius: "18px",
  boxShadow:
    "0 8px 20px rgba(0,0,0,0.08)",
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: "8px",
  border:
    "1px solid #cbd5e1",
  fontSize: "14px",
};

const labelStyle = {
  display: "block",
  fontWeight: "bold",
  marginBottom: "7px",
};

const filterStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "end",
  marginBottom: "15px",
};

const darkButton = {
  background: "#111827",
  color: "white",
  border: "none",
  padding: "11px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const clearButton = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  padding: "11px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const tableStyle = {
  width: "100%",
  borderCollapse:
    "collapse",
};

const tableHeader = {
  textAlign: "left",
  padding: "12px",
  background: "#f8fafc",
  borderBottom:
    "2px solid #e2e8f0",
};

const tableCell = {
  padding: "12px",
  borderBottom:
    "1px solid #e2e8f0",
};

export default Reports;