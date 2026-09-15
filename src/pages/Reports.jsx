import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/client";
import gaLogo from "../assets/ga-logo.png";

/* ============================================================
   REPORT CALCULATION RULES
============================================================

NORMAL / CUSTOMER JOB
---------------------
Gross   = job.price
Discount = job.discount
Net     = max(Gross - Discount, 0)
Paid    = payments linked to job.id
Balance = Net - Paid


TEYSEER JOB
-----------
Sources:
- Teyseer Motors
- Teyseer Motors - Salah
- Teyseer Motors - Bahaa

If job_services exist:
    Net = SUM(job_services.price)

If no services exist:
    Net = max(job.price - job.discount, 0)


PAYMENTS
--------
A payment is counted for a job ONLY when:

payment.job_id === job.id


IMPORTANT
---------
All reports use calculateJob() as the single source of truth.

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
   HTML ESCAPE
============================================================ */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    (sum, service) =>
      sum + number(service.price),
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
    Services are the canonical amount
    when at least one service exists.
  */

  const canonicalNet =
    teyseer && services.length > 0
      ? serviceTotal
      : jobNet;

  /*
    ONLY payments connected to this job.
  */

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
    Difference between:
      job.price - discount
    and:
      services total
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

    linkedPayments,
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

  const [activeSection, setActiveSection] =
    useState("overview");

  useEffect(() => {
    loadReports();
    loadReportSettings();
  }, []);

  /* ==========================================================
     LOAD REPORT DATA
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

  /* ==========================================================
     SETTINGS
  ========================================================== */

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

  function changePending(month, value) {
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
      /*
        IMPORTANT:
        Payments without job_id are NOT
        assigned to any job.
      */

      if (
        payment.job_id === null ||
        payment.job_id === undefined ||
        payment.job_id === ""
      ) {
        return;
      }

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
     LINKED PAYMENTS ONLY
  ========================================================== */

  const linkedPayments = useMemo(() => {
    return payments.filter(
      (payment) =>
        payment.job_id !== null &&
        payment.job_id !== undefined &&
        payment.job_id !== ""
    );
  }, [payments]);

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

    /*
      IMPORTANT FIX:
      Payment method totals use ONLY
      payments linked to jobs.

      This keeps them consistent with
      the canonical paid total.
    */

    const cashPaid =
      linkedPayments
        .filter(isCash)
        .reduce(
          (sum, payment) =>
            sum + number(payment.amount),
          0
        );

    const cardPaid =
      linkedPayments
        .filter(isCard)
        .reduce(
          (sum, payment) =>
            sum + number(payment.amount),
          0
        );

    const bankTransferPaid =
      linkedPayments
        .filter(isBankTransfer)
        .reduce(
          (sum, payment) =>
            sum + number(payment.amount),
          0
        );

    const otherPaid =
      linkedPayments
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

    const categorizedPaid =
      cashPaid +
      cardPaid +
      bankTransferPaid +
      otherPaid;

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

      categorizedPaid,
    };
  }, [
    calculatedJobs,
    linkedPayments,
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
          String(job.source || "").trim() ===
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
          String(job.source || "").trim() ===
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
          String(job.source || "").trim() ===
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
     UNLINKED PAYMENTS
  ========================================================== */

  const unlinkedPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.job_id === null ||
          payment.job_id === undefined ||
          payment.job_id === ""
      ),
    [payments]
  );

  const unlinkedPaymentTotal =
    unlinkedPayments.reduce(
      (sum, payment) =>
        sum + number(payment.amount),
      0
    );

  /* ==========================================================
     DAILY PAYMENTS
  ========================================================== */

  const dailyPayments = useMemo(() => {
    const result = {};

    linkedPayments.forEach((payment) => {
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

      const amount =
        number(payment.amount);

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
  }, [linkedPayments]);

  /* ==========================================================
     SELECTED DATE PAYMENTS
  ========================================================== */

  const selectedDatePayments =
    useMemo(
      () =>
        linkedPayments.filter((payment) => {
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
      [linkedPayments, reportDate]
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

  const currentMonth =
    today.slice(0, 7);

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
            <div class="label">CARS</div>
            <div class="value">
              ${alnusoorJobs.length}
            </div>
          </div>

          <div class="box">
            <div class="label">GROSS</div>
            <div class="value">
              QAR ${money(alnusoorGross)}
            </div>
          </div>

          <div class="box">
            <div class="label">DISCOUNT</div>
            <div class="value">
              QAR ${money(alnusoorDiscount)}
            </div>
          </div>

          <div class="box">
            <div class="label">NET</div>
            <div class="value">
              QAR ${money(alnusoorNet)}
            </div>
          </div>

          <div class="box">
            <div class="label">BALANCE</div>
            <div class="value">
              QAR ${money(alnusoorBalance)}
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
  if (!reportDate) {
    alert("Please select a date.");
    return;
  }

  const dailyJobs = selectedDateJobs || [];

  const rows = dailyJobs
    .map(
      (job, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${getJobDate(job) || "-"}</td>
          <td>${escapeHtml(job.source || "-")}</td>
          <td>${escapeHtml(job.customer || "-")}</td>
          <td>
            ${escapeHtml(
              job.carMake ||
                job.carType ||
                job.carModel ||
                "-"
            )}
          </td>
          <td>${escapeHtml(job.plate || "-")}</td>
          <td>${escapeHtml(job.serviceNames || "-")}</td>
          <td class="money">
            QAR ${money(job.canonicalNet)}
          </td>
          <td class="money">
            QAR ${money(job.paid)}
          </td>
          <td class="money">
            QAR ${money(job.balance)}
          </td>
        </tr>
      `
    )
    .join("");

  const printWindow = window.open(
    "",
    "_blank",
    "width=1500,height=1000"
  );

  if (!printWindow) {
    alert("Please allow pop-ups for this website.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>

    <head>
      <title>
        Daily Report - ${reportDate}
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

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
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

        .section-title {
          font-size: 13px;
          font-weight: bold;
          margin: 18px 0 8px;
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
        DAILY REPORT
      </div>

      <div class="period">
        Date: ${reportDate}
      </div>

      <div class="summary">

        <div class="box">
          <div class="boxLabel">
            CARS
          </div>

          <div class="boxValue">
            ${dailyJobs.length}
          </div>
        </div>

        <div class="box">
          <div class="boxLabel">
            SALES
          </div>

          <div class="boxValue">
            QAR ${money(selectedDateSales)}
          </div>
        </div>

        <div class="box">
          <div class="boxLabel">
            PAID FROM JOBS
          </div>

          <div class="boxValue">
            QAR ${money(selectedDatePaid)}
          </div>
        </div>

        <div class="box">
          <div class="boxLabel">
            PAYMENT TRANSACTIONS
          </div>

          <div class="boxValue">
            QAR ${money(selectedDatePaymentTotal)}
          </div>
        </div>

        <div class="box">
          <div class="boxLabel">
            BALANCE
          </div>

          <div class="boxValue">
            QAR ${money(selectedDateBalance)}
          </div>
        </div>

      </div>

      <div class="section-title">
        DAILY PAYMENTS
      </div>

      <table>

        <thead>
          <tr>
            <th>DATE</th>
            <th>CASH</th>
            <th>VISA</th>
            <th>MASTERCARD</th>
            <th>BANK</th>
            <th>OTHER</th>
            <th>TOTAL</th>
          </tr>
        </thead>

        <tbody>

          ${
            dailyPayments
              .filter(([date]) => date === reportDate)
              .map(
                ([date, data]) => `
                  <tr>
                    <td>${date}</td>

                    <td class="money">
                      QAR ${money(data.cash)}
                    </td>

                    <td class="money">
                      QAR ${money(data.visa)}
                    </td>

                    <td class="money">
                      QAR ${money(data.mastercard)}
                    </td>

                    <td class="money">
                      QAR ${money(data.bankTransfer)}
                    </td>

                    <td class="money">
                      QAR ${money(data.other)}
                    </td>

                    <td class="money">
                      QAR ${money(data.total)}
                    </td>
                  </tr>
                `
              )
              .join("") ||
            `
              <tr>
                <td colspan="7" style="text-align:center;">
                  No payment data found.
                </td>
              </tr>
            `
          }

        </tbody>

      </table>

      <div class="section-title">
        DAILY CARS
      </div>

      <table>

        <thead>
          <tr>
            <th>#</th>
            <th>DATE</th>
            <th>SOURCE</th>
            <th>CUSTOMER</th>
            <th>CAR</th>
            <th>PLATE</th>
            <th>SERVICES</th>
            <th>NET</th>
            <th>PAID</th>
            <th>BALANCE</th>
          </tr>
        </thead>

        <tbody>

          ${rows}

          ${
            dailyJobs.length === 0
              ? `
                <tr>
                  <td
                    colspan="10"
                    style="text-align:center; padding:20px;"
                  >
                    No jobs found for this date.
                  </td>
                </tr>
              `
              : ""
          }

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
   UI HELPERS
========================================================== */

function Card({
  title,
  value,
  color = "blue",
  subtitle,
}) {
  return (
    <div className="report-card">
      <div className="report-card-title">
        {title}
      </div>

      <div
        className={`report-card-value ${color}`}
      >
        {value}
      </div>

      {subtitle && (
        <div className="report-card-subtitle">
          {subtitle}
        </div>
      )}
    </div>
  );
}


/* ==========================================================
   LOADING
========================================================== */

if (loading) {
  return (
    <div
      style={{
        padding: 40,
        textAlign: "center",
        fontSize: 18,
      }}
    >
      Loading reports...
    </div>
  );
}


/* ==========================================================
   RENDER
========================================================== */

return (
  <div className="reports-page">

    <style>{`
      * {
        box-sizing: border-box;
      }

      .reports-page {
        padding: 24px;
        background: #f3f4f6;
        min-height: 100vh;
        color: #111827;
        font-family: Arial, sans-serif;
      }

      .reports-header {
        background: white;
        border-radius: 16px;
        padding: 22px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 18px;
        box-shadow: 0 2px 8px rgba(0,0,0,.06);
      }

      .reports-header img {
        width: 75px;
        height: 75px;
        object-fit: contain;
      }

      .reports-header h1 {
        margin: 0 0 5px;
        font-size: 25px;
      }

      .reports-header p {
        margin: 0;
        color: #6b7280;
      }

      .tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }

      .tab {
        border: none;
        background: white;
        padding: 11px 18px;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        color: #4b5563;
      }

      .tab.active {
        background: #111827;
        color: white;
      }

      .cards {
        display: grid;
        grid-template-columns:
          repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }

      .report-card {
        background: white;
        border-radius: 14px;
        padding: 18px;
        box-shadow: 0 2px 8px rgba(0,0,0,.05);
      }

      .report-card-title {
        color: #6b7280;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .report-card-value {
        font-size: 24px;
        font-weight: 800;
      }

      .report-card-subtitle {
        margin-top: 5px;
        font-size: 12px;
        color: #9ca3af;
      }

      .blue {
        color: #2563eb;
      }

      .green {
        color: #16a34a;
      }

      .red {
        color: #dc2626;
      }

      .purple {
        color: #7c3aed;
      }

      .orange {
        color: #ea580c;
      }

      .section {
        background: white;
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,.05);
      }

      .section h2 {
        margin-top: 0;
        font-size: 19px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        margin-bottom: 15px;
        flex-wrap: wrap;
      }

      .filters {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: end;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .field label {
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
      }

      .field input {
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 9px 11px;
        background: white;
      }

      .btn {
        border: none;
        border-radius: 8px;
        padding: 10px 14px;
        cursor: pointer;
        font-weight: 700;
      }

      .btn-dark {
        background: #111827;
        color: white;
      }

      .btn-blue {
        background: #2563eb;
        color: white;
      }

      .btn-green {
        background: #16a34a;
        color: white;
      }

      .btn-gray {
        background: #e5e7eb;
        color: #111827;
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 750px;
      }

      th {
        background: #111827;
        color: white;
        padding: 11px;
        text-align: left;
        font-size: 12px;
      }

      td {
        padding: 10px;
        border-bottom: 1px solid #e5e7eb;
        font-size: 13px;
      }

      .right {
        text-align: right;
      }

      .negative {
        color: #dc2626;
      }

      .positive {
        color: #16a34a;
      }

      .warning {
        background: #fff7ed;
        border: 1px solid #fed7aa;
        color: #9a3412;
        padding: 13px;
        border-radius: 10px;
        margin-bottom: 15px;
      }

      .settings-grid {
        display: grid;
        grid-template-columns:
          repeat(auto-fit, minmax(220px, 1fr));
        gap: 15px;
      }

      .setting {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 15px;
      }

      .setting-title {
        font-weight: 700;
        margin-bottom: 8px;
      }

      .setting input {
        width: 100%;
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
      }

      .source-grid {
        display: grid;
        grid-template-columns:
          repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
      }

      .source-box {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 15px;
      }

      .source-name {
        color: #6b7280;
        font-size: 12px;
        margin-bottom: 6px;
      }

      .source-value {
        font-size: 21px;
        font-weight: 800;
      }

      @media (max-width: 700px) {
        .reports-page {
          padding: 12px;
        }

        .reports-header {
          padding: 15px;
        }
      }
    `}</style>


    {/* =====================================================
        HEADER
    ===================================================== */}

    <div className="reports-header">

      <img
        src={gaLogo}
        alt="Haosheng"
      />

      <div>
        <h1>
          Financial Reports
        </h1>

        <p>
          Haosheng Car Service and Accessories
        </p>
      </div>

    </div>


    {/* =====================================================
        TABS
    ===================================================== */}

    <div className="tabs">

      <button
        className={`tab ${
          activeSection === "overview"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setActiveSection("overview")
        }
      >
        Overview
      </button>

      <button
        className={`tab ${
          activeSection === "teyseer"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setActiveSection("teyseer")
        }
      >
        Teyseer
      </button>

      <button
        className={`tab ${
          activeSection === "alnusoor"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setActiveSection("alnusoor")
        }
      >
        Al Nusoor
      </button>

      <button
        className={`tab ${
          activeSection === "daily"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setActiveSection("daily")
        }
      >
        Daily
      </button>

      <button
        className={`tab ${
          activeSection === "settings"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setActiveSection("settings")
        }
      >
        Settings
      </button>

    </div>


    {/* =====================================================
        OVERVIEW
    ===================================================== */}

    {activeSection === "overview" && (
      <>
        <div className="cards">

          <Card
            title="Gross Sales"
            value={`QAR ${money(
              financial.grossSales
            )}`}
            color="blue"
          />

          <Card
            title="Discounts"
            value={`QAR ${money(
              financial.discounts
            )}`}
            color="orange"
          />

          <Card
            title="Net Sales"
            value={`QAR ${money(
              financial.netSales
            )}`}
            color="purple"
          />

          <Card
            title="Paid"
            value={`QAR ${money(
              financial.paid
            )}`}
            color="green"
          />

          <Card
            title="Balance"
            value={`QAR ${money(
              financial.balance
            )}`}
            color={
              financial.balance > 0
                ? "red"
                : "green"
            }
          />

          <Card
            title="Total Cars"
            value={
              calculatedJobs.length
            }
            color="blue"
          />

          <Card
            title="Cars Today"
            value={carsToday}
            color="green"
          />

          <Card
            title="Cars This Week"
            value={carsThisWeek}
            color="purple"
          />

          <Card
            title="Cars This Month"
            value={carsThisMonth}
            color="orange"
          />

        </div>


        <div className="section">

          <h2>
            Customer vs Teyseer
          </h2>

          <div className="cards">

            <Card
              title="Customer Sales"
              value={`QAR ${money(
                customerSales
              )}`}
              color="blue"
            />

            <Card
              title="Customer Paid"
              value={`QAR ${money(
                customerPaid
              )}`}
              color="green"
            />

            <Card
              title="Customer Balance"
              value={`QAR ${money(
                customerBalance
              )}`}
              color="red"
            />

            <Card
              title="Teyseer Sales"
              value={`QAR ${money(
                teyseerSales
              )}`}
              color="purple"
            />

            <Card
              title="Teyseer Paid"
              value={`QAR ${money(
                teyseerPaid
              )}`}
              color="green"
            />

            <Card
              title="Teyseer Balance"
              value={`QAR ${money(
                teyseerBalance
              )}`}
              color="red"
            />

          </div>

        </div>


        <div className="section">

          <h2>
            Payment Methods
          </h2>

          <div className="cards">

            <Card
              title="Cash"
              value={`QAR ${money(
                financial.cashPaid
              )}`}
              color="green"
            />

            <Card
              title="Card"
              value={`QAR ${money(
                financial.cardPaid
              )}`}
              color="blue"
            />

            <Card
              title="Bank Transfer"
              value={`QAR ${money(
                financial.bankTransferPaid
              )}`}
              color="purple"
            />

            <Card
              title="Other"
              value={`QAR ${money(
                financial.otherPaid
              )}`}
              color="orange"
            />

          </div>

          {Math.abs(
            financial.paid -
              financial.categorizedPaid
          ) > 0.01 && (
            <div className="warning">
              Payment method totals do not
              equal total linked payments.
              Please check payment methods.
            </div>
          )}

          {unlinkedPayments.length > 0 && (
            <div className="warning">
              There are{" "}
              <strong>
                {unlinkedPayments.length}
              </strong>{" "}
              payments without a job ID,
              totaling{" "}
              <strong>
                QAR{" "}
                {money(
                  unlinkedPaymentTotal
                )}
              </strong>
              . These are intentionally NOT
              included in job balances.
            </div>
          )}

        </div>


        <div className="section">

          <div className="section-header">

            <h2>
              Teyseer Discrepancies
            </h2>

            <button
              className="btn btn-gray"
              onClick={() =>
                setShowDiscrepancies(
                  (prev) => !prev
                )
              }
            >
              {showDiscrepancies
                ? "Hide"
                : "Show"}
            </button>

          </div>

          <div className="cards">

            <Card
              title="Jobs With Difference"
              value={
                discrepancyJobs.length
              }
              color={
                discrepancyJobs.length
                  ? "red"
                  : "green"
              }
            />

            <Card
              title="Total Difference"
              value={`QAR ${money(
                totalTeyseerDiscrepancy
              )}`}
              color={
                Math.abs(
                  totalTeyseerDiscrepancy
                ) > 0.01
                  ? "red"
                  : "green"
              }
            />

          </div>

          {showDiscrepancies &&
            discrepancyJobs.length > 0 && (
              <div className="table-wrap">

                <table>

                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>SOURCE</th>
                      <th>CUSTOMER</th>
                      <th>JOB NET</th>
                      <th>SERVICES</th>
                      <th>DIFFERENCE</th>
                    </tr>
                  </thead>

                  <tbody>

                    {discrepancyJobs.map(
                      (job) => (
                        <tr key={job.id}>

                          <td>
                            {getJobDate(
                              job
                            ) || "-"}
                          </td>

                          <td>
                            {job.source ||
                              "-"}
                          </td>

                          <td>
                            {job.customer ||
                              "-"}
                          </td>

                          <td className="right">
                            QAR{" "}
                            {money(
                              job.jobNet
                            )}
                          </td>

                          <td className="right">
                            QAR{" "}
                            {money(
                              job.serviceTotal
                            )}
                          </td>

                          <td
                            className={`right ${
                              job.discrepancy >
                              0
                                ? "positive"
                                : "negative"
                            }`}
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

              </div>
            )}

        </div>
      </>
    )}


    {/* =====================================================
        TEYSEER
    ===================================================== */}

    {activeSection === "teyseer" && (
      <>
        <div className="section">

          <div className="section-header">

            <h2>
              Teyseer Motors Report
            </h2>

            <button
              className="btn btn-dark"
              onClick={
                printTeyseerReport
              }
            >
              Print Report
            </button>

          </div>

          <div className="filters">

            <div className="field">

              <label>
                Start Date
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
              />

            </div>


            <div className="field">

              <label>
                End Date
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
              />

            </div>


            <button
              className="btn btn-gray"
              onClick={() => {
                setTeyseerStartDate("");
                setTeyseerEndDate("");
              }}
            >
              Clear
            </button>

          </div>

        </div>


        <div className="cards">

          <Card
            title="Teyseer Cars"
            value={
              filteredTeyseerJobs.length
            }
            color="blue"
          />

          <Card
            title="Net Sales"
            value={`QAR ${money(
              filteredTeyseerSales
            )}`}
            color="purple"
          />

          <Card
            title="Paid"
            value={`QAR ${money(
              filteredTeyseerPaid
            )}`}
            color="green"
          />

          <Card
            title="Balance"
            value={`QAR ${money(
              filteredTeyseerBalance
            )}`}
            color="red"
          />

        </div>


        <div className="section">

          <h2>
            Teyseer By Source
          </h2>

          <div className="source-grid">

            <div className="source-box">

              <div className="source-name">
                Teyseer Motors
              </div>

              <div className="source-value">
                QAR{" "}
                {money(
                  teyseerMotorsAmount
                )}
              </div>

            </div>


            <div className="source-box">

              <div className="source-name">
                Teyseer Motors - Salah
              </div>

              <div className="source-value">
                QAR{" "}
                {money(
                  salahAmount
                )}
              </div>

            </div>


            <div className="source-box">

              <div className="source-name">
                Teyseer Motors - Bahaa
              </div>

              <div className="source-value">
                QAR{" "}
                {money(
                  bahaaAmount
                )}
              </div>

            </div>

          </div>

        </div>


        <div className="section">

          <div className="table-wrap">

            <table>

              <thead>

                <tr>
                  <th>#</th>
                  <th>DATE</th>
                  <th>SOURCE</th>
                  <th>CUSTOMER</th>
                  <th>CAR</th>
                  <th>PLATE</th>
                  <th>SERVICES</th>
                  <th>VOUCHER</th>
                  <th>RECEIPT</th>
                  <th className="right">
                    NET
                  </th>
                  <th className="right">
                    PAID
                  </th>
                  <th className="right">
                    BALANCE
                  </th>
                </tr>

              </thead>

              <tbody>

                {filteredTeyseerJobs.map(
                  (job, index) => (
                    <tr key={job.id}>

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        {getJobDate(
                          job
                        ) || "-"}
                      </td>

                      <td>
                        {job.source ||
                          "-"}
                      </td>

                      <td>
                        {job.customer ||
                          "-"}
                      </td>

                      <td>
                        {job.carMake ||
                          job.carType ||
                          job.carModel ||
                          "-"}
                      </td>

                      <td>
                        {job.plate ||
                          "-"}
                      </td>

                      <td>
                        {job.serviceNames ||
                          "-"}
                      </td>

                      <td>
                        {job.voucherNumber ||
                          "-"}
                      </td>

                      <td>
                        {job.receipt_number ||
                          "-"}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          job.canonicalNet
                        )}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          job.paid
                        )}
                      </td>

                      <td
                        className={`right ${
                          job.balance > 0
                            ? "negative"
                            : "positive"
                        }`}
                      >
                        QAR{" "}
                        {money(
                          job.balance
                        )}
                      </td>

                    </tr>
                  )
                )}

                {filteredTeyseerJobs.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="12"
                      style={{
                        textAlign:
                          "center",
                        padding: 30,
                      }}
                    >
                      No Teyseer jobs
                      found.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </div>
      </>
    )}


    {/* =====================================================
        AL NUSOOR
    ===================================================== */}

    {activeSection === "alnusoor" && (
      <>
        <div className="section">

          <div className="section-header">

            <h2>
              Al Nusoor Center
            </h2>

            <button
              className="btn btn-dark"
              onClick={
                printAlnusoorReport
              }
            >
              Print Report
            </button>

          </div>

          <div className="filters">

            <div className="field">

              <label>
                Start Date
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
              />

            </div>


            <div className="field">

              <label>
                End Date
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
              />

            </div>


            <button
              className="btn btn-gray"
              onClick={() => {
                setAlnusoorStartDate("");
                setAlnusoorEndDate("");
              }}
            >
              Clear
            </button>

          </div>

        </div>


        <div className="cards">

          <Card
            title="Cars"
            value={
              alnusoorJobs.length
            }
            color="blue"
          />

          <Card
            title="Gross"
            value={`QAR ${money(
              alnusoorGross
            )}`}
            color="blue"
          />

          <Card
            title="Discount"
            value={`QAR ${money(
              alnusoorDiscount
            )}`}
            color="orange"
          />

          <Card
            title="Net"
            value={`QAR ${money(
              alnusoorNet
            )}`}
            color="purple"
          />

          <Card
            title="Paid"
            value={`QAR ${money(
              alnusoorPaid
            )}`}
            color="green"
          />

          <Card
            title="Balance"
            value={`QAR ${money(
              alnusoorBalance
            )}`}
            color="red"
          />

        </div>


        <div className="section">

          <div className="table-wrap">

            <table>

              <thead>

                <tr>
                  <th>DATE</th>
                  <th>CUSTOMER</th>
                  <th>CAR</th>
                  <th>PLATE</th>
                  <th className="right">
                    GROSS
                  </th>
                  <th className="right">
                    DISCOUNT
                  </th>
                  <th className="right">
                    NET
                  </th>
                  <th className="right">
                    PAID
                  </th>
                  <th className="right">
                    BALANCE
                  </th>
                </tr>

              </thead>

              <tbody>

                {alnusoorJobs.map(
                  (job) => (
                    <tr key={job.id}>

                      <td>
                        {getJobDate(
                          job
                        ) || "-"}
                      </td>

                      <td>
                        {job.customer ||
                          "-"}
                      </td>

                      <td>
                        {job.carMake ||
                          job.carType ||
                          job.carModel ||
                          "-"}
                      </td>

                      <td>
                        {job.plate ||
                          "-"}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          job.gross
                        )}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          job.discount
                        )}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          job.canonicalNet
                        )}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          job.paid
                        )}
                      </td>

                      <td
                        className={`right ${
                          job.balance > 0
                            ? "negative"
                            : "positive"
                        }`}
                      >
                        QAR{" "}
                        {money(
                          job.balance
                        )}
                      </td>

                    </tr>
                  )
                )}

                {alnusoorJobs.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="9"
                      style={{
                        textAlign:
                          "center",
                        padding: 30,
                      }}
                    >
                      No Al Nusoor
                      jobs found.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </div>
      </>
    )}


    {/* =====================================================
        DAILY
    ===================================================== */}

    {activeSection === "daily" && (
      <>

        <div className="section">

          <div className="section-header">

            <div>
              <h2>
                Daily Report
              </h2>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "end",
                flexWrap: "wrap",
              }}
            >

              <div className="field">

                <label>
                  Select Date
                </label>

                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) =>
                    setReportDate(
                      e.target.value
                    )
                  }
                />

              </div>

              <button
                className="btn btn-dark"
                onClick={
                  printDailyReport
                }
              >
                Print Daily Report
              </button>

            </div>

          </div>


          <div className="cards">

            <Card
              title="Cars"
              value={
                selectedDateJobs.length
              }
              color="blue"
            />

            <Card
              title="Sales"
              value={`QAR ${money(
                selectedDateSales
              )}`}
              color="purple"
            />

            <Card
              title="Paid From Jobs"
              value={`QAR ${money(
                selectedDatePaid
              )}`}
              color="green"
            />

            <Card
              title="Payment Transactions"
              value={`QAR ${money(
                selectedDatePaymentTotal
              )}`}
              color="blue"
            />

            <Card
              title="Balance"
              value={`QAR ${money(
                selectedDateBalance
              )}`}
              color="red"
            />

          </div>

        </div>


        <div className="section">

          <h2>
            Daily Payments
          </h2>

          <div className="table-wrap">

            <table>

              <thead>

                <tr>
                  <th>DATE</th>

                  <th className="right">
                    CASH
                  </th>

                  <th className="right">
                    VISA
                  </th>

                  <th className="right">
                    MASTERCARD
                  </th>

                  <th className="right">
                    BANK
                  </th>

                  <th className="right">
                    OTHER
                  </th>

                  <th className="right">
                    TOTAL
                  </th>
                </tr>

              </thead>

              <tbody>

                {dailyPayments.map(
                  ([date, data]) => (
                    <tr key={date}>

                      <td>
                        {date}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          data.cash
                        )}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          data.visa
                        )}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          data.mastercard
                        )}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          data.bankTransfer
                        )}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          data.other
                        )}
                      </td>

                      <td className="right">
                        QAR{" "}
                        {money(
                          data.total
                        )}
                      </td>

                    </tr>
                  )
                )}

                {dailyPayments.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        textAlign:
                          "center",
                        padding: 30,
                      }}
                    >
                      No payment data
                      found.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </div>


        <div className="section">

          <h2>
            Daily Cars
          </h2>

          <div className="table-wrap">

            <table>

              <thead>

                <tr>
                  <th>DATE</th>

                  <th className="right">
                    CARS
                  </th>
                </tr>

              </thead>

              <tbody>

                {dailyCarRows.map(
                  ([date, count]) => (
                    <tr key={date}>

                      <td>
                        {date}
                      </td>

                      <td className="right">
                        {count}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      </>
    )}


    {/* =====================================================
        SETTINGS
    ===================================================== */}

    {activeSection === "settings" && (
      <>

        <div className="section">

          <h2>
            Manual Report Settings
          </h2>

          <div className="settings-grid">

            {[
              ["June", manualPending.June],
              ["July", manualPending.July],
              [
                "August",
                manualPending.August,
              ],
            ].map(
              ([month, amount]) => (
                <div
                  className="setting"
                  key={month}
                >

                  <div className="setting-title">
                    {month} Pending
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) =>
                      changePending(
                        month,
                        e.target.value
                      )
                    }
                  />

                  {savingSetting ===
                    `${month} Pending` && (
                    <small>
                      Saving...
                    </small>
                  )}

                </div>
              )
            )}


            <div className="setting">

              <div className="setting-title">
                Previous Teyseer
              </div>

              <input
                type="number"
                step="0.01"
                value={
                  manualTeyseer
                }
                onChange={(e) =>
                  changeTeyseer(
                    e.target.value
                  )
                }
              />

              {savingSetting ===
                "Previous Teyseer" && (
                <small>
                  Saving...
                </small>
              )}

            </div>

          </div>

        </div>


        <div className="section">

          <h2>
            Current Data Summary
          </h2>

          <div className="cards">

            <Card
              title="Jobs"
              value={
                calculatedJobs.length
              }
              color="blue"
            />

            <Card
              title="Payments"
              value={
                payments.length
              }
              color="green"
            />

            <Card
              title="Job Services"
              value={
                jobServices.length
              }
              color="purple"
            />

            <Card
              title="Unlinked Payments"
              value={
                unlinkedPayments.length
              }
              color={
                unlinkedPayments.length
                  ? "red"
                  : "green"
              }
            />

          </div>

        </div>

      </>
    )}


    {/* =====================================================
        REFRESH
    ===================================================== */}

    <div
      style={{
        textAlign: "center",
        marginTop: 20,
      }}
    >

      <button
        className="btn btn-blue"
        onClick={loadReports}
      >
        Refresh Reports
      </button>

    </div>

  </div>
);

}

export default Reports;