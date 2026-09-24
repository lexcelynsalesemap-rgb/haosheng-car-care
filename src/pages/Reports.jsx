import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase/client";
import gaLogo from "../assets/ga-logo.png";
import * as XLSX from "xlsx";

function isCash(payment) {
  const method = String(
    payment?.method ??
    payment?.paymentMethod ??
    payment?.payment_method ??
    ""
  )
    .trim()
    .toLowerCase();

  return method === "cash";
}

function isCard(payment) {
  const method = String(
    payment?.method ??
    payment?.paymentMethod ??
    payment?.payment_method ??
    ""
  )
    .trim()
    .toLowerCase();

  return (
    method === "card" ||
    method === "credit card" ||
    method === "creditcard"
  );
}
function isBankTransfer(payment) {
  const method = String(
    payment?.method ??
    payment?.paymentMethod ??
    payment?.payment_method ??
    ""
  )
    .trim()
    .toLowerCase();

  return (
    method === "bank transfer" ||
    method === "bank_transfer" ||
    method === "banktransfer" ||
    method === "transfer"
  );
}


function isTeyseerSource(source) {
  const value = String(source || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, " - ");

  return [
    "teyseer motors",
    "teyseer motors - salah",
    "teyseer motors - bahaa",
    "teyseer motors - abdou",
  ].includes(value);
}

// Compatibility helper used by the Teyseer report section.
// A job is a Teyseer job when its source is any recognized Teyseer source.
function isTeyseerJob(job) {
  return isTeyseerSource(job?.source);
}

const TEYSEER_SOURCES = [
  "Teyseer Motors",
  "Teyseer Motors - Bahaa",
  "Teyseer Motors - Salah",
  "Teyseer Motors - Abdou",
];

const DEFAULT_PENDING = {
  June: 7000,
  July: 10000,
  August: 18700,
};

const DEFAULT_PREVIOUS_TEYSEER = 181200;

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
function getJobServicesDescription(job, jobServices = []) {
  const names = [];

  const addName = (value) => {
    if (value === null || value === undefined) return;

    if (typeof value === "object") {
      if (Array.isArray(value)) {
        value.forEach(addName);
        return;
      }

      const nestedName =
        value.service_name ??
        value.serviceName ??
        value.name ??
        value.title ??
        value.description ??
        value.service ??
        value.label;

      if (nestedName !== null && nestedName !== undefined) {
        addName(nestedName);
      }
      return;
    }

    let text = String(value).trim();
    if (!text || text === "-") return;

    // Services may be stored as JSON text.
    if (
      (text.startsWith("[") && text.endsWith("]")) ||
      (text.startsWith("{") && text.endsWith("}"))
    ) {
      try {
        addName(JSON.parse(text));
        return;
      } catch {
        // Keep the original text if it is not valid JSON.
      }
    }

    if (
      !names.some(
        (existing) =>
          existing.toLowerCase() === text.toLowerCase()
      )
    ) {
      names.push(text);
    }
  };

  // Direct service names.
  addName(job?.serviceNames);

  // Services stored directly on the job.
  const services = job?.services;

  if (Array.isArray(services)) {
    services.forEach(addName);
  } else if (services && typeof services === "object") {
    Object.entries(services).forEach(([key, value]) => {
      if (value && typeof value === "object") {
        addName(value);
      } else {
        addName(key);
      }
    });
  } else if (services) {
    addName(services);
  }

  // Service details.
  const serviceDetails = job?.serviceDetails;

  if (serviceDetails && typeof serviceDetails === "object") {
    if (Array.isArray(serviceDetails)) {
      serviceDetails.forEach(addName);
    } else {
      Object.entries(serviceDetails).forEach(
        ([serviceName, details]) => {
          if (details && typeof details === "object") {
            addName({
              ...details,
              name:
                details.service_name ??
                details.serviceName ??
                details.name ??
                serviceName,
            });
          } else {
            addName(serviceName);
          }
        }
      );
    }
  }

  // Fallback to the job_services table.
  if (Array.isArray(jobServices)) {
    jobServices
      .filter((service) => {
        const serviceJobId =
          service?.job_id ??
          service?.jobId ??
          service?.jobID;

        return (
          String(serviceJobId ?? "") ===
          String(job?.id ?? "")
        );
      })
      .forEach(addName);
  }

  return names.join(", ");
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


/*
============================================================
DASHBOARD-COMPATIBLE CALCULATION HELPERS
============================================================
These helpers intentionally mirror the Dashboard calculation:

service amount = price × quantity - service discount
Teyseer Motors = all services → Teyseer
Teyseer Motors - Salah/Bahaa/Abdou:
  WTT → Teyseer
  other → respective customer/sales person
Salah/Bahaa/Abdou = customer sales
Walk-in/Other = Sales Team/customer sales

Payments:
  pure Teyseer → Teyseer Paid
  anything with customer sales → Customer Paid
============================================================
*/

function normalizeSource(source) {
  return String(source || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isPureTeyseerSource(source) {
  return normalizeSource(source) === "teyseer motors";
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

/*
Dashboard uses the final service amount:
price × quantity - service discount
*/
function getServiceGross(serviceName, serviceDetails) {
  const details = serviceDetails?.[serviceName] || {};

  const price = Number(details.price || 0);
  const quantity = Number(details.quantity || 1);
  const serviceDiscount = Number(details.discount || 0);

  return Math.max(
    price * quantity - serviceDiscount,
    0
  );
}

function getJobSalesBreakdown(job) {
  const services = Array.isArray(job?.services)
    ? job.services
    : [];

  const serviceDetails =
    job?.serviceDetails &&
    typeof job.serviceDetails === "object"
      ? job.serviceDetails
      : {};

  const source = normalizeSource(job?.source);

  let gross = 0;
  let teyseer = 0;
  let salah = 0;
  let bahaa = 0;
  let abdou = 0;
  let salesTeam = 0;

  services.forEach((serviceName) => {
    const amount = getServiceGross(
      serviceName,
      serviceDetails
    );

    gross += amount;

    const isWtt = isWttService(serviceName);

    if (isPureTeyseerSource(source)) {
      teyseer += amount;
      return;
    }

    if (isTeyseerSalahSource(source)) {
      if (isWtt) teyseer += amount;
      else salah += amount;
      return;
    }

    if (isTeyseerBahaaSource(source)) {
      if (isWtt) teyseer += amount;
      else bahaa += amount;
      return;
    }

    if (isTeyseerAbdouSource(source)) {
      if (isWtt) teyseer += amount;
      else abdou += amount;
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

    if (source === "abdou") {
      abdou += amount;
      return;
    }

    salesTeam += amount;
  });

  return {
    gross,
    teyseer,
    salah,
    bahaa,
    abdou,
    salesTeam,
    customerSales:
      salah +
      bahaa +
      abdou +
      salesTeam,
  };
}

/*
Return the exact per-job fields used by Reports.
Important: job.services/serviceDetails are the Dashboard source
for sales calculation. job_services is NOT used to recalculate sales.
*/
function calculateJob(job, _jobServices, paymentsByJob) {
  const breakdown = getJobSalesBreakdown(job);

  const linkedPayments =
    paymentsByJob[String(job.id)] || [];

  const paid = linkedPayments.reduce(
    (sum, payment) =>
      sum + number(payment.amount),
    0
  );

  let customerPaid = 0;
  let teyseerPaid = 0;

  // Exact Dashboard payment allocation.
  if (
    breakdown.teyseer > 0 &&
    breakdown.customerSales <= 0
  ) {
    teyseerPaid = paid;
  } else if (
    breakdown.customerSales > 0
  ) {
    customerPaid = Math.min(
      paid,
      breakdown.customerSales
    );
  }

  const customerBalance = Math.max(
    breakdown.customerSales - customerPaid,
    0
  );

  const teyseerBalance = Math.max(
    breakdown.teyseer - teyseerPaid,
    0
  );

  /*
   * Keep these fields for the existing Reports UI.
   * gross/discount are the original job-level values used by
   * reports such as Al Nusoor.
   * serviceGross is the Dashboard-calculated service total.
   */
  const gross = number(job?.price);
  const discount = number(job?.discount);

  const canonicalNet =
    breakdown.teyseer +
    breakdown.customerSales;

  return {
    ...job,

    gross,
    discount,

    // Dashboard sales amount after service discounts.
    serviceGross: breakdown.gross,

    // Dashboard-compatible sales breakdown.
    teyseerSales: breakdown.teyseer,
    salahSales: breakdown.salah,
    bahaaSales: breakdown.bahaa,
    abdouSales: breakdown.abdou,
    salesTeamSales: breakdown.salesTeam,
    customerSales: breakdown.customerSales,

    canonicalNet,
    jobNet: canonicalNet,
    net: canonicalNet,

    paid,
    customerPaid,
    teyseerPaid,

    customerBalance,
    teyseerBalance,
    balance: customerBalance,

    discrepancy:
      canonicalNet -
      (breakdown.teyseer + breakdown.customerSales),

    cashPaid: linkedPayments
      .filter(isCash)
      .reduce(
        (sum, payment) =>
          sum + number(payment.amount),
        0
      ),

    cardPaid: linkedPayments
      .filter(isCard)
      .reduce(
        (sum, payment) =>
          sum + number(payment.amount),
        0
      ),

    bankTransferPaid: linkedPayments
      .filter(isBankTransfer)
      .reduce(
        (sum, payment) =>
          sum + number(payment.amount),
        0
      ),

    otherPaid: linkedPayments
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
      ),
  };
}

function getPaymentMethod(payment) {
  return String(
    payment?.payment_method ??
    payment?.method ??
    payment?.paymentMethod ??
    payment?.type ??
    ""
  )
    .trim()
    .toLowerCase();
}


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

function Reports() {
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [jobServices, setJobServices] =
    useState([]);

  const [manualPending, setManualPending] =
    useState(DEFAULT_PENDING);

  const [manualTeyseer, setManualTeyseer] =
    useState(
      DEFAULT_PREVIOUS_TEYSEER
    );

  const [savingSetting, setSavingSetting] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [reportDate, setReportDate] =
    useState(todayQatar());

const [reportMonth, setReportMonth] = useState(
  todayQatar().slice(0, 7)
);
  const [
    alnusoorStartDate,
    setAlnusoorStartDate,
  ] = useState("");

  const [
    alnusoorEndDate,
    setAlnusoorEndDate,
  ] = useState("");

  const [
    teyseerStartDate,
    setTeyseerStartDate,
  ] = useState("");

  const [
    teyseerEndDate,
    setTeyseerEndDate,
  ] = useState("");

  const [
    showDiscrepancies,
    setShowDiscrepancies,
  ] = useState(false);

  const [
    activeSection,
    setActiveSection,
  ] = useState("overview");

  /*
  ============================================================
  LOAD DATA
  ============================================================
  */

  useEffect(() => {
    loadReports();
    loadReportSettings();
  }, []);

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

      setJobs(
        jobsResult.data || []
      );

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

  /*
  ============================================================
  REPORT SETTINGS
  ============================================================
  */

  async function loadReportSettings() {
    const { data, error } =
      await supabase
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
              setting_name:
                settingName,
              amount:
                numericAmount,
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

  /*
  ============================================================
  PAYMENTS BY JOB
  ============================================================
  */

  const paymentsByJob =
    useMemo(() => {
      const map = {};

      payments.forEach((payment) => {
        if (
          payment.job_id === null ||
          payment.job_id === undefined ||
          payment.job_id === ""
        ) {
          return;
        }

        const key =
          String(payment.job_id);

        if (!map[key]) {
          map[key] = [];
        }

        map[key].push(payment);
      });

      return map;
    }, [payments]);

  /*
  ============================================================
  CALCULATED JOBS
  ============================================================
  */

  const calculatedJobs =
    useMemo(() => {
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

  /*
  ============================================================
  JOB DIFFERENCE DEBUG
  ============================================================
  */

  useEffect(() => {
    if (!calculatedJobs.length) {
      return;
    }

    let totalDifference = 0;

    calculatedJobs.forEach((job) => {
      const jobNet =
        number(job.jobNet);

      const customer =
        number(job.customerSales);

      const teyseer =
        number(job.teyseerSales);

      const allocated =
        customer + teyseer;

      const difference =
        jobNet - allocated;

      if (
        Math.abs(difference) >
        0.01
      ) {
        totalDifference +=
          difference;

        console.log(
          "JOB ID:",
          job.id,
          "| SOURCE:",
          job.source,
          "| JOB NET:",
          jobNet,
          "| CUSTOMER:",
          customer,
          "| TEYSEER:",
          teyseer,
          "| ALLOCATED:",
          allocated,
          "| DIFFERENCE:",
          difference
        );
      }
    });

    console.log(
      "TOTAL JOB DIFFERENCE:",
      totalDifference
    );
  }, [calculatedJobs]);

  /*
  ============================================================
  LINKED PAYMENTS
  ============================================================
  */

  const linkedPayments =
    useMemo(() => {
      return payments.filter(
        (payment) =>
          payment.job_id !== null &&
          payment.job_id !== undefined &&
          payment.job_id !== ""
      );
    }, [payments]);


  /*
 /*
============================================================
  FINANCIAL TOTALS
============================================================
*/


const financial = useMemo(() => {
  let teyseerSales = 0;
  let salahSales = 0;
  let bahaaSales = 0;
  let abdouSales = 0;
  let salesTeamSales = 0;

  let customerPaid = 0;
  let teyseerPaid = 0;

  calculatedJobs.forEach((job) => {
    teyseerSales += number(job.teyseerSales);
    salahSales += number(job.salahSales);
    bahaaSales += number(job.bahaaSales);
    abdouSales += number(job.abdouSales);
    salesTeamSales += number(job.salesTeamSales);

    customerPaid += number(job.customerPaid);
    teyseerPaid += number(job.teyseerPaid);
  });

  const customerSales =
    salahSales +
    bahaaSales +
    abdouSales +
    salesTeamSales;

  const totalSales =
    teyseerSales +
    customerSales;

  const paid =
    customerPaid +
    teyseerPaid;

  const customerBalance = Math.max(
    customerSales - customerPaid,
    0
  );

  const teyseerBalance = Math.max(
    teyseerSales - teyseerPaid,
    0
  );

  const serviceGross = calculatedJobs.reduce(
    (sum, job) =>
      sum + number(job.serviceGross),
    0
  );

  console.log(
    "========== REPORT SALES / DASHBOARD LOGIC =========="
  );
  console.log("TEYSEER SALES:", teyseerSales);
  console.log("SALAH SALES:", salahSales);
  console.log("BAHAA SALES:", bahaaSales);
  console.log("ABDOU SALES:", abdouSales);
  console.log("SALES TEAM SALES:", salesTeamSales);
  console.log("CUSTOMER / PERSONAL SALES:", customerSales);
  console.log("TOTAL SALES:", totalSales);
  console.log("SERVICE GROSS:", serviceGross);
  console.log("CUSTOMER PAID:", customerPaid);
  console.log("TEYSEER PAID:", teyseerPaid);
  console.log("TOTAL PAID:", paid);
  console.log("CUSTOMER BALANCE:", customerBalance);
  console.log("TEYSEER BALANCE:", teyseerBalance);
  console.log(
    "===================================================="
  );

  return {
    customerSales,
    teyseerSales,
    totalSales,

    // Keep existing UI field name.
    netSales: totalSales,

    // Dashboard-compatible paid totals.
    paid,
    customerPaid,
    teyseerPaid,

    customerBalance,
    teyseerBalance,

    // Service total after service-level discounts.
    serviceGross,

    cashPaid: linkedPayments
      .filter(isCash)
      .reduce(
        (sum, payment) =>
          sum + number(payment.amount),
        0
      ),

    cardPaid: linkedPayments
      .filter(isCard)
      .reduce(
        (sum, payment) =>
          sum + number(payment.amount),
        0
      ),

    bankTransferPaid: linkedPayments
      .filter(isBankTransfer)
      .reduce(
        (sum, payment) =>
          sum + number(payment.amount),
        0
      ),

    otherPaid: linkedPayments
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
      ),
  };
}, [
  calculatedJobs,
  linkedPayments,
]);


/*
============================================================
EXPORT WHOLE MONTH TO EXCEL
============================================================
*/

function exportMonthlyExcel() {
  if (!reportMonth) {
    alert("Please select a month.");
    return;
  }

  const monthStart = `${reportMonth}-01`;

  const [year, month] = reportMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  const monthEnd =
    `${reportMonth}-${String(lastDay).padStart(2, "0")}`;

  const inMonth = (date) => {
    if (!date) return false;

    const d = String(date).slice(0, 10);

    return d >= monthStart && d <= monthEnd;
  };

  /*
  ----------------------------------------------------------
  JOBS FOR SELECTED MONTH
  ----------------------------------------------------------
  */

  const monthJobs = calculatedJobs.filter((job) =>
    inMonth(getJobDate(job))
  );

  /*
  ----------------------------------------------------------
  PAYMENTS FOR SELECTED MONTH
  ----------------------------------------------------------
  */

  const monthPayments = payments.filter((payment) =>
    inMonth(payment.payment_date)
  );

  /*
  ----------------------------------------------------------
  JOB LOOKUP
  ----------------------------------------------------------
  */

  const jobMap = new Map(
    calculatedJobs.map((job) => [
      String(job.id),
      job
    ])
  );

  /*
  ----------------------------------------------------------
  HELPER FUNCTIONS
  ----------------------------------------------------------
  */

  const getCustomer = (job) =>
    job.customer ||
    job.customer_name ||
    job.customerName ||
    "";

  const getSource = (job) =>
    job.source ||
    job.sales_source ||
    job.salesSource ||
    "";

  const getPlate = (job) =>
    job.plate_number ||
    job.plateNumber ||
    job.plate ||
    job.car_plate ||
    "";

  const getMake = (job) =>
    job.car_make ||
    job.carMake ||
    job.make ||
    "";

  const getModel = (job) =>
    job.car_model ||
    job.carModel ||
    job.model ||
    "";

  const getVoucher = (job) =>
    job.voucher_no ||
    job.voucher ||
    job.voucherNumber ||
    "";

  const getReceipt = (job) =>
    job.receipt_no ||
    job.receipt ||
    job.receiptNumber ||
    "";

  const getServiceText = (job) => {
    try {
      return getJobServicesDescription(job, jobServices) || "";
    } catch {
      return "";
    }
  };

  /*
  ----------------------------------------------------------
  MONTHLY SALES TOTALS
  ----------------------------------------------------------
  */

  const monthlyTeyseerSales = monthJobs.reduce(
    (sum, job) => sum + number(job.teyseerSales),
    0
  );

  const monthlySalahSales = monthJobs.reduce(
    (sum, job) => sum + number(job.salahSales),
    0
  );

  const monthlyBahaaSales = monthJobs.reduce(
    (sum, job) => sum + number(job.bahaaSales),
    0
  );

  const monthlyAbdouSales = monthJobs.reduce(
    (sum, job) => sum + number(job.abdouSales),
    0
  );

  const monthlySalesTeamSales = monthJobs.reduce(
    (sum, job) => sum + number(job.salesTeamSales),
    0
  );

  const monthlyCustomerSales =
    monthlySalahSales +
    monthlyBahaaSales +
    monthlyAbdouSales +
    monthlySalesTeamSales;

  const monthlyTotalSales =
    monthlyTeyseerSales +
    monthlyCustomerSales;

  /*
  ----------------------------------------------------------
  CURRENT BALANCES OF MONTH JOBS
  ----------------------------------------------------------
  */

  const monthlyCustomerBalance = monthJobs.reduce(
    (sum, job) => sum + number(job.customerBalance),
    0
  );

  const monthlyTeyseerBalance = monthJobs.reduce(
    (sum, job) => sum + number(job.teyseerBalance),
    0
  );

  const monthlyTotalBalance =
    monthlyCustomerBalance +
    monthlyTeyseerBalance;

  /*
  ----------------------------------------------------------
  PAYMENTS BY JOB
  ----------------------------------------------------------
  */

  const paymentsByMonthJob = {};

  monthPayments.forEach((payment) => {
    const jobId = payment.job_id;

    if (
      jobId === null ||
      jobId === undefined ||
      String(jobId).trim() === ""
    ) {
      return;
    }

    const key = String(jobId);

    if (!paymentsByMonthJob[key]) {
      paymentsByMonthJob[key] = [];
    }

    paymentsByMonthJob[key].push(payment);
  });

  /*
  ----------------------------------------------------------
  MONTHLY COLLECTIONS
  Uses PAYMENT DATE, not job date.
  ----------------------------------------------------------
  */

  let monthlyCustomerPaid = 0;
  let monthlyTeyseerPaid = 0;

  Object.entries(paymentsByMonthJob).forEach(
    ([jobId, jobPayments]) => {
      const job = jobMap.get(jobId);

      if (!job) return;

      const totalJobPayment = jobPayments.reduce(
        (sum, payment) =>
          sum + number(payment.amount),
        0
      );

      /*
      Pure Teyseer:
      payment belongs to Teyseer.
      */

      if (
        number(job.customerSales) <= 0 &&
        number(job.teyseerSales) > 0
      ) {
        monthlyTeyseerPaid += totalJobPayment;
      }

      /*
      Customer sale:
      payment belongs to customer sales,
      capped by customer sales amount.
      */

      else if (number(job.customerSales) > 0) {
        monthlyCustomerPaid += Math.min(
          totalJobPayment,
          number(job.customerSales)
        );
      }
    }
  );

  const monthlyTotalPaid =
    monthlyCustomerPaid +
    monthlyTeyseerPaid;

  /*
  ----------------------------------------------------------
  PAYMENT METHOD TOTALS
  ----------------------------------------------------------
  */

  let monthlyCash = 0;
  let monthlyCard = 0;
  let monthlyBankTransfer = 0;
  let monthlyOther = 0;

  monthPayments.forEach((payment) => {
    const amount = number(payment.amount);
    const method = getPaymentMethod(payment);

    if (isCash(method)) {
      monthlyCash += amount;
    } else if (isCard(method)) {
      monthlyCard += amount;
    } else if (isBankTransfer(method)) {
      monthlyBankTransfer += amount;
    } else {
      monthlyOther += amount;
    }
  });

  /*
  ----------------------------------------------------------
  DAILY SUMMARY
  ----------------------------------------------------------
  */

  const dailyRows = [];

  for (let day = 1; day <= lastDay; day++) {
    const date =
      `${reportMonth}-${String(day).padStart(2, "0")}`;

    const dayJobs = monthJobs.filter(
      (job) => getJobDate(job) === date
    );

    const dayPayments = monthPayments.filter(
      (payment) =>
        String(payment.payment_date || "").slice(0, 10) === date
    );

    const dayTeyseerSales = dayJobs.reduce(
      (sum, job) => sum + number(job.teyseerSales),
      0
    );

    const daySalahSales = dayJobs.reduce(
      (sum, job) => sum + number(job.salahSales),
      0
    );

    const dayBahaaSales = dayJobs.reduce(
      (sum, job) => sum + number(job.bahaaSales),
      0
    );

    const dayAbdouSales = dayJobs.reduce(
      (sum, job) => sum + number(job.abdouSales),
      0
    );

    const daySalesTeamSales = dayJobs.reduce(
      (sum, job) => sum + number(job.salesTeamSales),
      0
    );

    const dayCustomerSales =
      daySalahSales +
      dayBahaaSales +
      dayAbdouSales +
      daySalesTeamSales;

    const dayTotalSales =
      dayTeyseerSales +
      dayCustomerSales;

    let dayCash = 0;
    let dayVisa = 0;
    let dayMastercard = 0;
    let dayBankTransfer = 0;
    let dayOther = 0;
    let dayPaid = 0;

    dayPayments.forEach((payment) => {
      const amount = number(payment.amount);
      const method = getPaymentMethod(payment);

      dayPaid += amount;

      if (isCash(method)) {
        dayCash += amount;
      } else if (isBankTransfer(method)) {
        dayBankTransfer += amount;
      } else if (
        String(method).toLowerCase().includes("visa")
      ) {
        dayVisa += amount;
      } else if (
        String(method).toLowerCase().includes("master")
      ) {
        dayMastercard += amount;
      } else {
        dayOther += amount;
      }
    });

    dailyRows.push({
      Date: date,
      "Cars / Jobs": dayJobs.length,

      "Teyseer Sales": Number(
        dayTeyseerSales.toFixed(2)
      ),

      "Salah Sales": Number(
        daySalahSales.toFixed(2)
      ),

      "Bahaa Sales": Number(
        dayBahaaSales.toFixed(2)
      ),

      "Abdou Sales": Number(
        dayAbdouSales.toFixed(2)
      ),

      "Sales Team": Number(
        daySalesTeamSales.toFixed(2)
      ),

      "Customer Sales": Number(
        dayCustomerSales.toFixed(2)
      ),

      "Total Sales": Number(
        dayTotalSales.toFixed(2)
      ),

      "Total Paid": Number(
        dayPaid.toFixed(2)
      ),

      Cash: Number(
        dayCash.toFixed(2)
      ),

      Visa: Number(
        dayVisa.toFixed(2)
      ),

      Mastercard: Number(
        dayMastercard.toFixed(2)
      ),

      "Bank Transfer": Number(
        dayBankTransfer.toFixed(2)
      ),

      Other: Number(
        dayOther.toFixed(2)
      )
    });
  }

  /*
  ----------------------------------------------------------
  ALL JOBS
  ----------------------------------------------------------
  */

  const allJobsRows = monthJobs.map((job) => ({
    Date: getJobDate(job),

    "Job ID": job.id,

    Customer: getCustomer(job),

    Source: getSource(job),

    "Car Make": getMake(job),

    Model: getModel(job),

    Plate: getPlate(job),

    Services: getServiceText(job),

    "Teyseer Sales": Number(
      number(job.teyseerSales).toFixed(2)
    ),

    "Salah Sales": Number(
      number(job.salahSales).toFixed(2)
    ),

    "Bahaa Sales": Number(
      number(job.bahaaSales).toFixed(2)
    ),

    "Abdou Sales": Number(
      number(job.abdouSales).toFixed(2)
    ),

    "Sales Team": Number(
      number(job.salesTeamSales).toFixed(2)
    ),

    "Customer Sales": Number(
      number(job.customerSales).toFixed(2)
    ),

    "Total Sales": Number(
      number(job.canonicalNet).toFixed(2)
    ),

    Paid: Number(
      number(job.paid).toFixed(2)
    ),

    "Customer Paid": Number(
      number(job.customerPaid).toFixed(2)
    ),

    "Teyseer Paid": Number(
      number(job.teyseerPaid).toFixed(2)
    ),

    "Customer Balance": Number(
      number(job.customerBalance).toFixed(2)
    ),

    "Teyseer Balance": Number(
      number(job.teyseerBalance).toFixed(2)
    ),

    "Total Balance": Number(
      (
        number(job.customerBalance) +
        number(job.teyseerBalance)
      ).toFixed(2)
    )
  }));

  /*
  ----------------------------------------------------------
  TEYSEER JOBS
  ----------------------------------------------------------
  */

  const teyseerRows = monthJobs
    .filter((job) => isTeyseerJob(job))
    .map((job) => ({
      Date: getJobDate(job),

      "Job ID": job.id,

      Customer: getCustomer(job),

      Source: getSource(job),

      "Car Make": getMake(job),

      Model: getModel(job),

      Plate: getPlate(job),

      "Teyseer Services": getServiceText(job),

      Voucher: getVoucher(job),

      Receipt: getReceipt(job),

      "Teyseer Sales": Number(
        number(job.teyseerSales).toFixed(2)
      ),

      "Teyseer Paid": Number(
        number(job.teyseerPaid).toFixed(2)
      ),

      "Teyseer Balance": Number(
        number(job.teyseerBalance).toFixed(2)
      )
    }));

  /*
  ----------------------------------------------------------
  CUSTOMER SALES
  ----------------------------------------------------------
  */

  const customerRows = monthJobs
    .filter(
      (job) => number(job.customerSales) > 0
    )
    .map((job) => ({
      Date: getJobDate(job),

      "Job ID": job.id,

      Customer: getCustomer(job),

      Source: getSource(job),

      "Car Make": getMake(job),

      Model: getModel(job),

      Plate: getPlate(job),

      "Salah Sales": Number(
        number(job.salahSales).toFixed(2)
      ),

      "Bahaa Sales": Number(
        number(job.bahaaSales).toFixed(2)
      ),

      "Abdou Sales": Number(
        number(job.abdouSales).toFixed(2)
      ),

      "Sales Team": Number(
        number(job.salesTeamSales).toFixed(2)
      ),

      "Customer Sales": Number(
        number(job.customerSales).toFixed(2)
      ),

      "Customer Paid": Number(
        number(job.customerPaid).toFixed(2)
      ),

      "Customer Balance": Number(
        number(job.customerBalance).toFixed(2)
      )
    }));

  /*
  ----------------------------------------------------------
  PAYMENTS
  ----------------------------------------------------------
  */

  const paymentRows = monthPayments.map((payment) => {
    const job = payment.job_id
      ? jobMap.get(String(payment.job_id))
      : null;

    return {
      Date: String(
        payment.payment_date || ""
      ).slice(0, 10),

      "Payment ID": payment.id,

      "Job ID": payment.job_id || "",

      Customer: job
        ? getCustomer(job)
        : "",

      Source: job
        ? getSource(job)
        : "",

      Plate: job
        ? getPlate(job)
        : "",

      Method: getPaymentMethod(payment),

      Amount: Number(
        number(payment.amount).toFixed(2)
      ),

      Status: job
        ? "Linked"
        : "Unlinked"
    };
  });

  /*
  ----------------------------------------------------------
  OUTSTANDING
  ----------------------------------------------------------
  */

  const outstandingRows = monthJobs
    .filter(
      (job) =>
        number(job.customerBalance) > 0 ||
        number(job.teyseerBalance) > 0
    )
    .map((job) => ({
      Date: getJobDate(job),

      "Job ID": job.id,

      Customer: getCustomer(job),

      Source: getSource(job),

      "Car Make": getMake(job),

      Model: getModel(job),

      Plate: getPlate(job),

      "Customer Sales": Number(
        number(job.customerSales).toFixed(2)
      ),

      "Teyseer Sales": Number(
        number(job.teyseerSales).toFixed(2)
      ),

      "Customer Paid": Number(
        number(job.customerPaid).toFixed(2)
      ),

      "Teyseer Paid": Number(
        number(job.teyseerPaid).toFixed(2)
      ),

      "Customer Balance": Number(
        number(job.customerBalance).toFixed(2)
      ),

      "Teyseer Balance": Number(
        number(job.teyseerBalance).toFixed(2)
      ),

      "Total Outstanding": Number(
        (
          number(job.customerBalance) +
          number(job.teyseerBalance)
        ).toFixed(2)
      )
    }));

  /*
  ----------------------------------------------------------
  AL NUSOOR
  ----------------------------------------------------------
  */

  const alNusoorRows = monthJobs
    .filter((job) => {
      const customer = String(
        getCustomer(job)
      ).toLowerCase();

      return (
        customer.includes("al nusoor") ||
        customer.includes("alnusoor")
      );
    })
    .map((job) => ({
      Date: getJobDate(job),

      "Job ID": job.id,

      Customer: getCustomer(job),

      "Car Make": getMake(job),

      Model: getModel(job),

      Plate: getPlate(job),

      Services: getServiceText(job),

      Gross: Number(
        number(job.gross).toFixed(2)
      ),

      Discount: Number(
        number(job.discount).toFixed(2)
      ),

      Net: Number(
        number(job.canonicalNet).toFixed(2)
      ),

      Paid: Number(
        number(job.customerPaid).toFixed(2)
      ),

      Balance: Number(
        number(job.customerBalance).toFixed(2)
      )
    }));

  /*
  ----------------------------------------------------------
  MONTHLY SUMMARY
  ----------------------------------------------------------
  */

  const summaryRows = [
    {
      "Report Month": reportMonth,
      "Period Start": monthStart,
      "Period End": monthEnd,
      "Cars / Jobs": monthJobs.length,

      "Teyseer Sales": Number(
        monthlyTeyseerSales.toFixed(2)
      ),

      "Salah Sales": Number(
        monthlySalahSales.toFixed(2)
      ),

      "Bahaa Sales": Number(
        monthlyBahaaSales.toFixed(2)
      ),

      "Abdou Sales": Number(
        monthlyAbdouSales.toFixed(2)
      ),

      "Sales Team": Number(
        monthlySalesTeamSales.toFixed(2)
      ),

      "Customer Sales": Number(
        monthlyCustomerSales.toFixed(2)
      ),

      "Total Sales": Number(
        monthlyTotalSales.toFixed(2)
      ),

      "Customer Paid": Number(
        monthlyCustomerPaid.toFixed(2)
      ),

      "Teyseer Paid": Number(
        monthlyTeyseerPaid.toFixed(2)
      ),

      "Total Paid": Number(
        monthlyTotalPaid.toFixed(2)
      ),

      "Current Customer Balance": Number(
        monthlyCustomerBalance.toFixed(2)
      ),

      "Current Teyseer Balance": Number(
        monthlyTeyseerBalance.toFixed(2)
      ),

      "Current Total Balance": Number(
        monthlyTotalBalance.toFixed(2)
      ),

      "Cash Collected": Number(
        monthlyCash.toFixed(2)
      ),

      "Card Collected": Number(
        monthlyCard.toFixed(2)
      ),

      "Bank Transfer": Number(
        monthlyBankTransfer.toFixed(2)
      ),

      "Other Payments": Number(
        monthlyOther.toFixed(2)
      )
    }
  ];

  /*
  ----------------------------------------------------------
  UNLINKED PAYMENTS
  ----------------------------------------------------------
  */

  const unlinkedRows = monthPayments
    .filter(
      (payment) =>
        !payment.job_id ||
        String(payment.job_id).trim() === ""
    )
    .map((payment) => ({
      Date: String(
        payment.payment_date || ""
      ).slice(0, 10),

      "Payment ID": payment.id,

      Method: getPaymentMethod(payment),

      Amount: Number(
        number(payment.amount).toFixed(2)
      ),

      Status: "UNLINKED"
    }));

  /*
  ----------------------------------------------------------
  CREATE EXCEL WORKBOOK
  ----------------------------------------------------------
  */

  const workbook = XLSX.utils.book_new();

  const addSheet = (
    sheetName,
    rows,
    widths = []
  ) => {
    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    if (widths.length) {
      worksheet["!cols"] = widths.map(
        (width) => ({
          wch: width
        })
      );
    }

    if (worksheet["!ref"]) {
      worksheet["!autofilter"] = {
        ref: worksheet["!ref"]
      };
    }

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      sheetName
    );
  };

  /*
  ----------------------------------------------------------
  ADD ALL SHEETS
  ----------------------------------------------------------
  */

  addSheet(
    "Monthly Summary",
    summaryRows,
    [
      15, 15, 15, 12,
      15, 15, 15, 15, 15,
      18, 15, 15, 15, 18,
      20, 20, 20, 15, 15, 18
    ]
  );

  addSheet(
    "Daily Summary",
    dailyRows,
    [
      14, 12, 15, 15, 15,
      15, 15, 18, 15, 15,
      15, 15, 15, 18, 15
    ]
  );

  addSheet(
    "All Jobs",
    allJobsRows,
    [
      14, 10, 25, 28, 15,
      18, 15, 50, 15, 15,
      15, 15, 15, 18, 15,
      15, 15, 18, 18, 18
    ]
  );

  addSheet(
    "Teyseer Jobs",
    teyseerRows,
    [
      14, 10, 25, 28, 15,
      18, 15, 55, 15, 15,
      18, 18, 18
    ]
  );

  addSheet(
    "Customer Sales",
    customerRows,
    [
      14, 10, 25, 28, 15,
      18, 15, 15, 15, 15,
      15, 18, 18
    ]
  );

  addSheet(
    "Payments",
    paymentRows,
    [
      14, 12, 10, 25, 28,
      15, 18, 15, 12
    ]
  );

  addSheet(
    "Outstanding",
    outstandingRows,
    [
      14, 10, 25, 28, 15,
      18, 15, 18, 18, 18,
      18, 20
    ]
  );

  addSheet(
    "Al Nusoor",
    alNusoorRows,
    [
      14, 10, 25, 15, 18,
      15, 50, 15, 15, 15,
      15, 18
    ]
  );

  addSheet(
    "Unlinked Payments",
    unlinkedRows,
    [
      14, 12, 18, 15, 15
    ]
  );

  /*
  ----------------------------------------------------------
  FILE NAME
  ----------------------------------------------------------
  */

  const fileName =
    `Haosheng_Monthly_Report_${reportMonth}.xlsx`;

  XLSX.writeFile(
    workbook,
    fileName
  );

  alert(
    `Excel report created successfully for ${reportMonth}.`
  );
}

  /*
  ============================================================
  DAILY PAYMENTS
  ============================================================
  */

  const dailyPayments =
    useMemo(() => {
      const result = {};

      linkedPayments.forEach(
        (payment) => {
          const date = String(
            payment.payment_date ||
              ""
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
            number(
              payment.amount
            );

          const method =
            getPaymentMethod(
              payment
            );

          result[date].total +=
            amount;

          if (isCash(payment)) {
            result[date].cash +=
              amount;
          } else if (
            method.includes("visa")
          ) {
            result[date].visa +=
              amount;
          } else if (
            method.includes(
              "mastercard"
            ) ||
            method.includes(
              "master card"
            )
          ) {
            result[date].mastercard +=
              amount;
          } else if (
            isBankTransfer(
              payment
            )
          ) {
            result[date]
              .bankTransfer +=
              amount;
          } else {
            result[date].other +=
              amount;
          }
        }
      );

      return Object.entries(
        result
      ).sort(
        ([a], [b]) =>
          b.localeCompare(a)
      );
    }, [linkedPayments]);

  /*
  ============================================================
  SELECTED DATE
  ============================================================
  */

  const selectedDatePayments =
    useMemo(() => {
      return linkedPayments.filter(
        (payment) => {
          if (
            !payment.payment_date
          ) {
            return false;
          }

          return (
            String(
              payment.payment_date
            ).slice(0, 10) ===
            reportDate
          );
        }
      );
    }, [
      linkedPayments,
      reportDate,
    ]);

  const selectedDatePaymentTotal =
    selectedDatePayments.reduce(
      (sum, payment) =>
        sum +
        number(
          payment.amount
        ),
      0
    );

  const selectedDateJobs =
    useMemo(() => {
      return calculatedJobs.filter(
        (job) =>
          getJobDate(job) ===
          reportDate
      );
    }, [
      calculatedJobs,
      reportDate,
    ]);
console.log(
  "=== DAILY TEYSEER DEBUG ==="
);

console.log(
  "=== DAILY TEYSEER DEBUG ===",
  JSON.stringify(
    selectedDateJobs.map((job) => ({
      id: job.id,
      date: getJobDate(job),
      source: job.source,
      normalizedSource: normalizeSource(job.source),
      customerSales: job.customerSales,
      teyseerSales: job.teyseerSales,
      jobNet: job.jobNet,
      serviceNames: job.serviceNames,
      services: job.services?.map((s) => ({
        name:
          s.service_name ||
          s.name ||
          s.title,
        price:
          s.price ??
          s.unit_price ??
          s.amount ??
          s.total,
        quantity:
          s.quantity ??
          s.qty,
      })),
    })),
    null,
    2
  )
);

console.log(
  "DAILY TEYSEER TOTAL:",
  selectedDateJobs.reduce(
    (sum, job) =>
      sum + number(job.teyseerSales),
    0
  )
);
  const selectedDateCustomerSales =
    selectedDateJobs.reduce(
      (sum, job) =>
        sum +
        number(
          job.customerSales
        ),
      0
    );

 const selectedDateTeyseerSales =
  selectedDateJobs.reduce(
    (sum, job) => {
      const teyseerAmount = number(
        job.teyseerSales
      );

      return sum + teyseerAmount;
    },
    0
  );

  const selectedDateSales =
    selectedDateCustomerSales +
    selectedDateTeyseerSales;

  const selectedDatePaid =
    selectedDateJobs.reduce(
      (sum, job) =>
        sum +
        number(job.paid),
      0
    );

  const selectedDateCustomerPaid =
    selectedDateJobs.reduce(
      (sum, job) =>
        sum +
        number(
          job.customerPaid
        ),
      0
    );

  const selectedDateBalance =
    selectedDateJobs.reduce(
      (sum, job) =>
        sum +
        number(
          job.customerBalance
        ),
      0
    );

  /*
  ============================================================
  CAR COUNTS
  ============================================================
  */

  const today =
    todayQatar();

  const carsToday =
    calculatedJobs.filter(
      (job) =>
        getJobDate(job) ===
        today
    ).length;

  const currentMonth =
    today.slice(0, 7);

  const carsThisMonth =
    calculatedJobs.filter(
      (job) => {
        const date =
          getJobDate(job);

        return (
          date &&
          date.slice(0, 7) ===
            currentMonth
        );
      }
    ).length;

  function isSameWeekQatar(
    dateString
  ) {
    if (!dateString) {
      return false;
    }

    const date = new Date(
      `${dateString}T12:00:00`
    );

    const todayDate =
      new Date(
        `${today}T12:00:00`
      );

    const day =
      todayDate.getDay();

    const mondayOffset =
      day === 0
        ? 6
        : day - 1;

    const monday =
      new Date(todayDate);

    monday.setDate(
      monday.getDate() -
        mondayOffset
    );

    const sunday =
      new Date(monday);

    sunday.setDate(
      sunday.getDate() + 6
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

  const dailyCars = {};

  calculatedJobs.forEach(
    (job) => {
      const date =
        getJobDate(job);

      if (!date) return;

      dailyCars[date] =
        (dailyCars[date] || 0) +
        1;
    }
  );

  const dailyCarRows =
    Object.entries(
      dailyCars
    ).sort(
      ([a], [b]) =>
        b.localeCompare(a)
    );
 /*
============================================================
AL NUSOOR
============================================================
*/

const alnusoorJobs = useMemo(() => {
  return calculatedJobs.filter((job) => {
    const customer = String(job?.customer || "")
      .toLowerCase()
      .trim();

    const isAlnusoor =
      customer.includes("al nusoor") ||
      customer.includes("alnusoor");

    if (!isAlnusoor) {
      return false;
    }

    return isDateInRange(
      getJobDate(job),
      alnusoorStartDate,
      alnusoorEndDate
    );
  });
}, [
  calculatedJobs,
  alnusoorStartDate,
  alnusoorEndDate,
]);

const alnusoorGross = alnusoorJobs.reduce(
  (sum, job) => sum + number(job?.gross),
  0
);

const alnusoorDiscount = alnusoorJobs.reduce(
  (sum, job) => sum + number(job?.discount),
  0
);

const alnusoorNet = alnusoorJobs.reduce(
  (sum, job) => sum + number(job?.canonicalNet),
  0
);

const alnusoorPaid = alnusoorJobs.reduce(
  (sum, job) => sum + number(job?.customerPaid),
  0
);

const alnusoorBalance = alnusoorJobs.reduce(
  (sum, job) => sum + number(job?.customerBalance),
  0
);

/*
============================================================
PRINT AL NUSOOR
============================================================
*/

function printAlnusoorReport() {
  if (alnusoorJobs.length === 0) {
    alert("No Al Nusoor jobs found.");
    return;
  }

  const rows = alnusoorJobs
    .map(
      (job) => `
        <tr>
          <td>${getJobDate(job) || "-"}</td>
          <td>${escapeHtml(job?.customer || "-")}</td>
          <td>${escapeHtml(
            job?.carMake ||
            job?.carType ||
            job?.carModel ||
            "-"
          )}</td>
          <td>${escapeHtml(job?.plate || "-")}</td>
          <td class="money">${money(job?.gross)}</td>
          <td class="money">${money(job?.discount)}</td>
          <td class="money">${money(job?.canonicalNet)}</td>
          <td class="money">${money(job?.customerPaid)}</td>
          <td class="money">${money(job?.customerBalance)}</td>
        </tr>
      `
    )
    .join("");

  const printWindow = window.open(
    "",
    "_blank",
    "width=1200,height=1000"
  );

  if (!printWindow) {
    alert("Please allow pop-ups for this website.");
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
          grid-template-columns: repeat(6, 1fr);
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

      <h2>AL NUSOOR CENTER REPORT</h2>

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
          <div class="label">PAID</div>
          <div class="value">
            QAR ${money(alnusoorPaid)}
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
};


/*
============================================================
TEYSEER JOBS
============================================================
*/

const filteredTeyseerJobs = useMemo(() => {
  return calculatedJobs.filter((job) => {
    if (!isTeyseerJob(job)) {
      return false;
    }

    return isDateInRange(
      getJobDate(job),
      teyseerStartDate,
      teyseerEndDate
    );
  });
}, [
  calculatedJobs,
  teyseerStartDate,
  teyseerEndDate,
]);

const teyseerJobs = filteredTeyseerJobs;

const filteredTeyseerSales =
  filteredTeyseerJobs.reduce(
    (sum, job) =>
      sum + number(job.teyseerSales),
    0
  );

const filteredTeyseerPaid =
  filteredTeyseerJobs.reduce(
    (sum, job) =>
      sum + number(job.teyseerPaid),
    0
  );

const filteredTeyseerBalance =
  filteredTeyseerJobs.reduce(
    (sum, job) =>
      sum + number(job.teyseerBalance),
    0
  );


/*
============================================================
TEYSEER SOURCE AMOUNTS
============================================================
*/

const teyseerSourceAmounts = useMemo(() => {
  const totals = {
    "Teyseer Motors": 0,
    "Teyseer Motors - Salah": 0,
    "Teyseer Motors - Bahaa": 0,
    "Teyseer Motors - Abdou": 0,
  };

  filteredTeyseerJobs.forEach((job) => {
    const source = normalizeSource(job?.source);

    if (source === "teyseer motors") {
      totals["Teyseer Motors"] +=
        number(job?.teyseerSales);
      return;
    }

    if (source === "teyseer motors - salah") {
      totals["Teyseer Motors - Salah"] +=
        number(job?.teyseerSales);
      return;
    }

    if (source === "teyseer motors - bahaa") {
      totals["Teyseer Motors - Bahaa"] +=
        number(job?.teyseerSales);
      return;
    }

    if (source === "teyseer motors - abdou") {
      totals["Teyseer Motors - Abdou"] +=
        number(job?.teyseerSales);
    }
  });

  return totals;
}, [filteredTeyseerJobs]);

const teyseerMotorsAmount =
  teyseerSourceAmounts["Teyseer Motors"];

const salahAmount =
  teyseerSourceAmounts["Teyseer Motors - Salah"];

const bahaaAmount =
  teyseerSourceAmounts["Teyseer Motors - Bahaa"];

const abdouAmount =
  teyseerSourceAmounts["Teyseer Motors - Abdou"];


/*
============================================================
TEYSEER SERVICE COUNTS
============================================================
*/

const teyseerMotorsServiceItems = useMemo(() => {
  return filteredTeyseerJobs
    .filter(
      (job) =>
        normalizeSource(job?.source) ===
        "Teyseer Motors"
    )
    .reduce(
      (count, job) =>
        count +
        (Array.isArray(job?.services)
          ? job.services.length
          : 0),
      0
    );
}, [filteredTeyseerJobs]);

const salahServiceItems = useMemo(() => {
  return filteredTeyseerJobs
    .filter(
      (job) =>
        normalizeSource(job?.source) ===
        "Teyseer Motors - Salah"
    )
    .reduce(
      (count, job) =>
        count +
        (Array.isArray(job?.services)
          ? job.services.length
          : 0),
      0
    );
}, [filteredTeyseerJobs]);

const bahaaServiceItems = useMemo(() => {
  return filteredTeyseerJobs
    .filter(
      (job) =>
        normalizeSource(job?.source) ===
        "Teyseer Motors - Bahaa"
    )
    .reduce(
      (count, job) =>
        count +
        (Array.isArray(job?.services)
          ? job.services.length
          : 0),
      0
    );
}, [filteredTeyseerJobs]);

const abdouServiceItems = useMemo(() => {
  return filteredTeyseerJobs
    .filter(
      (job) =>
        normalizeSource(job?.source) ===
        "Teyseer Motors - Abdou"
    )
    .reduce(
      (count, job) =>
        count +
        (Array.isArray(job?.services)
          ? job.services.length
          : 0),
      0
    );
}, [filteredTeyseerJobs]);

const filteredTeyseerCars =
  filteredTeyseerJobs.length;


/*
============================================================
TEYSEER DESCRIPTION
============================================================
*/

function getTeyseerDescription(job) {
  return getJobServicesDescription(
    job,
    jobServices
  );
}


/*
============================================================
TEYSEER DISCREPANCIES
============================================================
*/

const discrepancyJobs = useMemo(() => {
  return teyseerJobs.filter(
    (job) =>
      Math.abs(
        number(job?.discrepancy)
      ) > 0.01
  );
}, [teyseerJobs]);

const totalTeyseerDiscrepancy =
  discrepancyJobs.reduce(
    (sum, job) =>
      sum + number(job?.discrepancy),
    0
  );


/*
============================================================
UNLINKED PAYMENTS
============================================================
*/

const unlinkedPayments = useMemo(() => {
  return payments.filter(
    (payment) =>
      payment?.job_id === null ||
      payment?.job_id === undefined ||
      payment?.job_id === ""
  );
}, [payments]);

const unlinkedPaymentTotal =
  unlinkedPayments.reduce(
    (sum, payment) =>
      sum + number(payment?.amount),
    0
  );

/*
============================================================
PRINT TEYSEER REPORT
============================================================
*/

async function printTeyseerReport() {
  if (!filteredTeyseerJobs.length) {
    alert("No Teyseer jobs found.");
    return;
  }

  const sortedTeyseerJobs = [...filteredTeyseerJobs].sort(
    (a, b) => {
      const dateA = getJobDate(a) || "";
      const dateB = getJobDate(b) || "";

      return dateA.localeCompare(dateB);
    }
  );

  function normalizeSource(source) { return String(source || "") .trim() .toLowerCase() .replace(/\s+/g, " ") .replace(/\s*-\s*/g, " - "); } function isTeyseerSource(source) { const normalized = normalizeSource(source); return [ "teyseer motors", "teyseer motors - salah", "teyseer motors - bahaa", "teyseer motors - abdou", ].includes(normalized); }
  function getCarMake(job) {
    return (
      job.carType ||
      job.car_type ||
      job.carMake ||
      job.car_make ||
      job.make ||
      job.carBrand ||
      job.brand ||
      "-"
    );
  }

  function getCarModel(job) {
    return (
      job.carModel ||
      job.car_model ||
      job.model ||
      "-"
    );
  }

  function getPlate(job) {
    return (
      job.plate ||
      job.plateNumber ||
      job.plate_number ||
      job.plate_no ||
      "-"
    );
  }

  function getVoucher(job) {
    return (
      job.voucherNumber ||
      job.voucher_number ||
      job.voucher ||
      "-"
    );
  }

  function getReceipt(job) {
    return (
      job.receipt_number ||
      job.receiptNumber ||
      job.receipt ||
      "-"
    );
  }

  /*
   * LOAD ONLY SERVICES OWNED BY TEYSEER
   */
  const jobIds = sortedTeyseerJobs.map(
    (job) => job.id
  );

  const { data: teyseerServices, error } =
  await supabase
    .from("job_services")
    .select("*")
    .in("job_id", jobIds);

if (error) {
  console.error(
    "TEYSEER SERVICES ERROR:",
    error
  );

  alert(error.message);
  return;
}

const servicesByJob = {};

(teyseerServices || []).forEach((service) => {
  if (!servicesByJob[service.job_id]) {
    servicesByJob[service.job_id] = [];
  }

  servicesByJob[service.job_id].push(service);
});


function getTeyseerServices(job) {
  const source = normalizeSource(job?.source);

  const services = servicesByJob[job.id] || [];

  if (source === "teyseer motors") {
    if (!services.length) {
      return "-";
    }

    return services
      .map((service) =>
        service?.service_name ||
        service?.name ||
        service?.title ||
        ""
      )
      .filter(Boolean)
      .join(", ");
  }

  const teyseerServices = services.filter(
    (service) =>
      normalizeSource(service?.owner) === "teyseer"
  );

  if (!teyseerServices.length) {
    return "-";
  }

  return teyseerServices
    .map((service) =>
      service?.service_name ||
      service?.name ||
      service?.title ||
      ""
    )
    .filter(Boolean)
    .join(", ");
}


function getJobPrice(job) {
  const source = normalizeSource(job?.source);

  const services = servicesByJob[job.id] || [];

  let servicesToCalculate;

  if (source === "teyseer motors") {
    servicesToCalculate = services;
  } else {
    servicesToCalculate = services.filter(
      (service) =>
        normalizeSource(service?.owner) === "teyseer"
    );
  }

  return servicesToCalculate.reduce(
    (total, service) => {
      const price = Number(
        service?.price || 0
      );

      const quantity = Number(
        service?.quantity ||
        service?.qty ||
        1
      );

      const discount = Number(
        service?.discount || 0
      );

      const amount =
        Math.max(
          price * quantity - discount,
          0
        );

      return total + amount;
    },
    0
  );
}
  const rows = sortedTeyseerJobs
    .map((job) => {
      const source = job.source || "";

      const description =
        isTeyseerSource(source)
          ? getTeyseerServices(job)
          : "-";

      const amount =
        getJobPrice(job);

      return `
        <tr>
          <td>
            ${escapeHtml(
              getJobDate(job) || "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              getCarMake(job)
            )}
          </td>

          <td>
            ${escapeHtml(
              getCarModel(job)
            )}
          </td>

          <td>
            ${escapeHtml(
              getPlate(job)
            )}
          </td>

          <td class="description">
            ${escapeHtml(
              description
            )}
          </td>

          <td class="voucher">
            ${escapeHtml(
              getVoucher(job)
            )}
          </td>

          <td class="receipt">
            ${escapeHtml(
              getReceipt(job)
            )}
          </td>

          <td class="price">
            QAR ${money(amount)}
          </td>
        </tr>
      `;
    })
    .join("");

  /*
   * TOTAL TEYSEER AMOUNT
   */
  const totalAmount =
    sortedTeyseerJobs.reduce(
      (total, job) =>
        total + number(job.teyseerSales),
      0
    );

  const invoiceDate =
    new Date().toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

  const invoiceNumber =
    String(
      typeof teyseerInvoiceNumber !==
        "undefined"
        ? teyseerInvoiceNumber
        : "0006"
    ).padStart(4, "0");

  const printWindow = window.open(
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
<meta charset="UTF-8">

<title>Teyseer Motors Invoice</title>

<style>

* {
  box-sizing: border-box;
}

@page {
  size: A4 landscape;
  margin: 8mm;
}

html,
body {
  margin: 0;
  padding: 0;
  background: white;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
  font-size: 10px;
  padding: 8px;
}

.invoice {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: flex-start;
  min-height: 95px;
  border-bottom: 2px solid #111;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.logoArea {
  width: 125px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.logo {
  width: 100px;
  height: 85px;
  object-fit: contain;
}

.companyArea {
  flex: 1;
  padding-top: 2px;
}

.companyName {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 7px;
}

.arabicName {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 7px;
  direction: rtl;
  text-align: left;
}

.address {
  font-size: 9px;
  color: #333;
}

.invoiceTitleArea {
  width: 190px;
  text-align: right;
  padding-top: 5px;
}

.invoiceTitle {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 12px;
}

.invoiceNumber {
  font-size: 11px;
  font-weight: 700;
}

.infoTable {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
}

.infoTable td {
  padding: 5px 4px;
  vertical-align: top;
  border: none;
  font-size: 10px;
}

.infoLabel {
  width: 145px;
  font-weight: 800;
  white-space: nowrap;
}

.infoValue {
  font-weight: 600;
}

.infoRightLabel {
  width: 105px;
  font-weight: 800;
  white-space: nowrap;
}

.infoRightValue {
  width: 160px;
}

.mainTable {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 5px;
}

.mainTable th {
  border: 1px solid #111;
  background: #fff;
  color: #111;
  padding: 6px 5px;
  text-align: left;
  font-size: 9px;
  font-weight: 800;
}

.mainTable td {
  border: 1px solid #111;
  padding: 5px;
  vertical-align: top;
  font-size: 9px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.date {
  width: 10%;
}

.make {
  width: 10%;
}

.model {
  width: 12%;
}

.plate {
  width: 11%;
}

.description {
  width: 29%;
}

.voucher {
  width: 8%;
  text-align: center;
}

.receipt {
  width: 8%;
  text-align: center;
}

.price {
  width: 12%;
  text-align: right;
  white-space: nowrap;
  font-weight: 600;
}

.totalArea {
  width: 100%;
  border-collapse: collapse;
}

.totalArea td {
  padding: 6px 5px;
  font-size: 10px;
  font-weight: 800;
}

.totalLabel {
  text-align: right;
  border: 1px solid #111;
  border-top: none;
}

.totalValue {
  width: 12%;
  text-align: right;
  border: 1px solid #111;
  border-top: none;
  white-space: nowrap;
}

.netAmount {
  margin-top: 8px;
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 800;
}

.netAmountLabel {
  width: 145px;
}

.netAmountValue {
  font-size: 13px;
}

.payment {
  margin-top: 8px;
  font-size: 10px;
  line-height: 1.6;
}

.paymentTitle {
  font-weight: 800;
}

.signatureArea {
  display: flex;
  justify-content: space-between;
  margin-top: 45px;
  min-height: 65px;
}

.signatureBox {
  width: 40%;
  text-align: center;
}

.signatureArabic {
  font-size: 10px;
  margin-bottom: 5px;
}

.signatureEnglish {
  font-size: 10px;
  font-weight: 700;
}

.signatureLine {
  margin-top: 25px;
  border-bottom: 1px solid #111;
}

.footer {
  margin-top: 18px;
  padding-top: 7px;
  border-top: 1px solid #111;
  text-align: center;
  font-size: 8px;
  line-height: 1.5;
}

@media print {

  body {
    padding: 0;
  }

  .invoice {
    width: 100%;
    max-width: none;
  }

  thead {
    display: table-header-group;
  }

  tr {
    page-break-inside: avoid;
  }

  .signatureArea,
  .footer {
    page-break-inside: avoid;
  }

}

</style>
</head>

<body>

<div class="invoice">

<div class="header">

<div class="logoArea">
<img
  src="${gaLogo}"
  class="logo"
/>
</div>

<div class="companyArea">

<div class="companyName">
HAOSHENG CAR SERVICE AND ACCESSORIES
</div>

<div class="arabicName">
هاوشنغ لخدمات وزينة السيارات
</div>

<div class="address">
Building 358, Salwa Road,
Doha - Qatar
</div>

</div>

<div class="invoiceTitleArea">

<div class="invoiceTitle">
INVOICE
</div>

<div class="invoiceNumber">
INVOICE NO. ${invoiceNumber}
</div>

</div>

</div>

<table class="infoTable">

<tr>
<td class="infoLabel">
DATE:
</td>

<td class="infoValue">
${escapeHtml(invoiceDate)}
</td>

<td class="infoRightLabel">
INVOICE NO.
</td>

<td class="infoRightValue">
${escapeHtml(invoiceNumber)}
</td>
</tr>

<tr>
<td class="infoLabel">
NAME/COMPANY:
</td>

<td
class="infoValue"
colspan="3"
>
TEYSEER MOTORS CO. WLL.
</td>
</tr>

<tr>
<td class="infoLabel">
ADDRESS:
</td>

<td
class="infoValue"
colspan="3"
>
AIRPORT St. DOHA, QATAR
</td>
</tr>

<tr>
<td class="infoLabel">
CONTACT NUMBER:
</td>

<td
class="infoValue"
colspan="3"
>
50900458
</td>
</tr>

</table>

<table class="mainTable">

<thead>

<tr>

<th class="date">
DATE
</th>

<th class="make">
CAR MAKE
</th>

<th class="model">
MODEL
</th>

<th class="plate">
PLATE NO.
</th>

<th class="description">
DESCRIPTION
</th>

<th class="voucher">
Voucher#
</th>

<th class="receipt">
RECEIPT #
</th>

<th class="price">
PRICE
</th>

</tr>

</thead>

<tbody>
${rows}
</tbody>

</table>

<table class="totalArea">

<tr>

<td class="totalLabel">
TOTAL AMOUNT:
</td>

<td class="totalValue">
QAR ${money(totalAmount)}
</td>

</tr>

</table>

<div class="netAmount">

<div class="netAmountLabel">
NET AMOUNT:
</div>

<div class="netAmountValue">
QAR ${money(totalAmount)}
</div>

</div>

<div class="payment">

<div class="paymentTitle">
PAYMENT METHOD:
</div>

CASH /
VISA /
MASTERCARD /
AMEX /
NAPS /
BANK TRANSFER

</div>

<div class="signatureArea">

<div class="signatureBox">

<div class="signatureArabic">
توقيع العميل
</div>

<div class="signatureEnglish">
CUSTOMER'S SIGNATURE
</div>

<div class="signatureLine"></div>

</div>

<div class="signatureBox">

<div class="signatureArabic">
توقيع المعتمد
</div>

<div class="signatureEnglish">
AUTHORIZED SIGNATURE
</div>

<div class="signatureLine"></div>

</div>

</div>

<div class="footer">

<strong>
Tel: +974 3368 1888 -
C.R.NO: 199725 -
E-mail: info@haoshengcar.com
</strong>

<br>

Fereej Al Manaseer,
Zone 55, St. 340,
Bldg 358, Salwa Road,
Doha, Qatar

</div>

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
  /*
  ============================================================
  PRINT DAILY
  ============================================================
  */

  function printDailyReport() {
    if (!reportDate) {
      alert(
        "Please select a date."
      );
      return;
    }

    const dailyJobs =
      selectedDateJobs || [];

    const totalTeyseerSales =
      selectedDateTeyseerSales;

    const totalCustomerSales =
      selectedDateCustomerSales;

    const totalSales =
      selectedDateSales;

    const totalCustomerPaid =
      selectedDateCustomerPaid;

    const totalBalance =
      selectedDateBalance;

    const rows = dailyJobs
  .map(
    (job, index) => `
      <tr>
        <td>${index + 1}</td>

        <td>
          ${escapeHtml(
            getJobDate(job) || "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            job.source || "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            job.customer || "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            job.carModel ||
              job.carType ||
              job.carMake ||
              "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            job.plate || "-"
          )}
        </td>

        <td class="services">
          ${escapeHtml(
            getJobServicesDescription(
              job,
              jobServices
            ) || "-"
          )}
        </td>

        <td class="money">
          QAR ${money(job.serviceGross)}
        </td>

        <td class="money">
          QAR ${money(job.discount)}
        </td>

        <td class="money">
          QAR ${money(job.paid)}
        </td>

        <td class="money">
          QAR ${money(
            job.customerBalance
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

    const selectedPaymentRows =
      dailyPayments
        .filter(
          ([date]) =>
            date === reportDate
        )
        .map(
          ([date, data]) => `
            <tr>
              <td>${escapeHtml(date)}</td>

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
                QAR ${money(
                  data.bankTransfer
                )}
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
        .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>

      <head>

        <title>
          Daily Report - ${escapeHtml(
            reportDate
          )}
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
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 10px;
            margin: 15px 0;
          }

          .box {
            border: 1px solid #999;
            padding: 8px;
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
  table-layout: fixed;
}

th {
  background: #111827;
  color: white;
  padding: 6px 4px;
  text-align: left;
  font-size: 8px;
  font-weight: 700;
}

td {
  padding: 5px 4px;
  border: 1px solid #d1d5db;
  vertical-align: top;
  font-size: 8px;
  overflow-wrap: anywhere;
}

.number {
  width: 2.5%;
  text-align: center;
  padding: 4px 1px;
}

.services {
  width: 28%;
}

.money {
  width: 12%;
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
          Date: ${escapeHtml(
            reportDate
          )}
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
              TEYSEER SALES
            </div>

            <div class="boxValue">
              QAR ${money(
                totalTeyseerSales
              )}
            </div>
          </div>

          <div class="box">
            <div class="boxLabel">
              CUSTOMER SALES
            </div>

            <div class="boxValue">
              QAR ${money(
                totalCustomerSales
              )}
            </div>
          </div>

          <div class="box">
            <div class="boxLabel">
              TOTAL SALES
            </div>

            <div class="boxValue">
              QAR ${money(
                totalSales
              )}
            </div>
          </div>

          <div class="box">
            <div class="boxLabel">
              CUSTOMER PAID
            </div>

            <div class="boxValue">
              QAR ${money(
                totalCustomerPaid
              )}
            </div>
          </div>

          <div class="box">
            <div class="boxLabel">
              CUSTOMER BALANCE
            </div>

            <div class="boxValue">
              QAR ${money(
                totalBalance
              )}
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
              selectedPaymentRows ||
              `
                <tr>
                  <td
                    colspan="7"
                    style="text-align:center;"
                  >
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
  <th>CAR MODEL</th>
  <th>PLATE</th>
  <th>SERVICES</th>
  <th>GROSS TOTAL</th>
  <th>DISCOUNT</th>
  <th>PAID</th>
  <th>BALANCE</th>
</tr>

          </thead>

          <tbody>

            ${
              rows ||
              `
                <tr>
                  <td
                    colspan="11"
                    style="
                      text-align:center;
                      padding:20px;
                    "
                  >
                    No jobs found for this date.
                  </td>
                </tr>
              `
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

  /*
  ============================================================
  LOADING
  ============================================================
  */

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

  /*
  ============================================================
  RENDER
  ============================================================
  */

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

      <div className="tabs">

        {[
          ["overview", "Overview"],
          ["teyseer", "Teyseer"],
          ["alnusoor", "Al Nusoor"],
          ["daily", "Daily"],
          ["settings", "Settings"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`tab ${
              activeSection === key
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveSection(key)
            }
          >
            {label}
          </button>
        ))}

      </div>

     {activeSection === "overview" && (
  <>
    <div className="cards">

  <Card
  title="Internal Sales"
  value={`QAR ${money(
    financial.netSales
  )}`}
  color="blue"
/>

<Card
  title="Customer Net Sales"
  value={`QAR ${money(
    financial.customerSales
  )}`}
  color="purple"
/>

<Card
  title="Teyseer Sales"
  value={`QAR ${money(
    financial.teyseerSales
  )}`}
  color="orange"
/>

<Card
  title="Total Paid"
  value={`QAR ${money(
    financial.paid
  )}`}
  color="green"
/>

<Card
  title="Customer Balance"
  value={`QAR ${money(
    financial.customerBalance
  )}`}
  color={
    financial.customerBalance > 0
      ? "red"
      : "green"
  }
/>

  <Card
    title="Total Cars"
    value={calculatedJobs.length}
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
            financial.customerSales
          )}`}
          color="blue"
        />

        <Card
          title="Customer Balance"
          value={`QAR ${money(
            financial.customerBalance
          )}`}
          color="red"
        />

        <Card
          title="Teyseer Sales"
          value={`QAR ${money(
            financial.teyseerSales
          )}`}
          color="purple"
        />

        <Card
          title="Teyseer Balance"
          value={`QAR ${money(
            financial.teyseerBalance
          )}`}
          color="orange"
        />

        <Card
          title="Unallocated Payment"
          value={`QAR ${money(
            financial.unallocatedPayment
          )}`}
          color={
            financial.unallocatedPayment > 0
              ? "red"
              : "green"
          }
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
                .
                These are intentionally NOT
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
                filteredTeyseerCars
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

              <div className="source-box">

                <div className="source-name">
                  Teyseer Motors - Abdou
                </div>

                <div className="source-value">
                  QAR{" "}
                  {money(
                    abdouAmount
                  )}
                </div>

              </div>

            </div>

          </div>

          <div className="section">

            <h2>
              Service Items
            </h2>

            <div className="source-grid">

              <div className="source-box">

                <div className="source-name">
                  Teyseer Motors
                </div>

                <div className="source-value">
                  {teyseerMotorsServiceItems}
                </div>

                <div>
                  Net Sales: QAR{" "}
                  {money(
                    teyseerMotorsAmount
                  )}
                </div>

              </div>

              <div className="source-box">

                <div className="source-name">
                  Salah
                </div>

                <div className="source-value">
                  {salahServiceItems}
                </div>

                <div>
                  Net Sales: QAR{" "}
                  {money(
                    salahAmount
                  )}
                </div>

              </div>

              <div className="source-box">

                <div className="source-name">
                  Bahaa
                </div>

                <div className="source-value">
                  {bahaaServiceItems}
                </div>

                <div>
                  Net Sales: QAR{" "}
                  {money(
                    bahaaAmount
                  )}
                </div>

              </div>

              <div className="source-box">

                <div className="source-name">
                  Abdou
                </div>

                <div className="source-value">
                  {abdouServiceItems}
                </div>

                <div>
                  Net Sales: QAR{" "}
                  {money(
                    abdouAmount
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
                      TEYSEER NET
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
                          {getJobServicesDescription(
                            job,
                            jobServices
                          ) || "-"}
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
                            job.teyseerSales
                          )}
                        </td>

                        <td className="right">
                          QAR{" "}
                          {money(
                            job.teyseerPaid
                          )}
                        </td>

                        <td className="right">
                          QAR{" "}
                          {money(
                            job.teyseerBalance
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
                        No Teyseer jobs found.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </div>
        </>
      )}

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
                            job.customerPaid
                          )}
                        </td>

                        <td
                          className={`right ${
                            job.customerBalance >
                            0
                              ? "negative"
                              : "positive"
                          }`}
                        >
                          QAR{" "}
                          {money(
                            job.customerBalance
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

      {activeSection === "daily" && (
        <>
          <div className="section">

            <div className="section-header">

              <h2>
                Daily Report
              </h2>

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
                title="Customer Sales"
                value={`QAR ${money(
                  selectedDateCustomerSales
                )}`}
                color="purple"
              />

              <Card
                title="Teyseer Sales"
                value={`QAR ${money(
                  selectedDateTeyseerSales
                )}`}
                color="orange"
              />

              <Card
                title="Total Sales"
                value={`QAR ${money(
                  selectedDateSales
                )}`}
                color="blue"
              />

              <Card
                title="Customer Paid"
                value={`QAR ${money(
                  selectedDateCustomerPaid
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
                title="Customer Balance"
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

          <div className="section">

            <h2>
              Daily Jobs
            </h2>

            <div className="table-wrap">

              <table>

                <thead>

                  <tr>
                    <th>DATE</th>
                    <th>SOURCE</th>
                    <th>CUSTOMER</th>
                    <th>CAR</th>
                    <th>PLATE</th>
                    <th>SERVICES</th>
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

                  {selectedDateJobs.map(
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
                          {getJobServicesDescription(
                            job,
                            jobServices
                          ) || "-"}
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

                        <td className="right">
                          QAR{" "}
                          {money(
                            job.customerBalance
                          )}
                        </td>

                      </tr>
                    )
                  )}

                  {selectedDateJobs.length ===
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
                        No jobs found for
                        this date.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </div>
        </>
      )}
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "15px"
  }}
>
  <label
    style={{
      fontWeight: "600"
    }}
  >
    Excel Month:
  </label>

  <input
    type="month"
    value={reportMonth}
    onChange={(e) =>
      setReportMonth(e.target.value)
    }
    style={{
      padding: "8px 10px",
      border: "1px solid #ccc",
      borderRadius: "6px"
    }}
  />

  <button
    type="button"
    onClick={exportMonthlyExcel}
    style={{
      padding: "9px 16px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "600"
    }}
  >
    📊 EXPORT MONTH TO EXCEL
  </button>
</div>

      {activeSection === "settings" && (
        <>
          <div className="section">

            <h2>
              Manual Report Settings
            </h2>

            <div className="settings-grid">

              {[
                [
                  "June",
                  manualPending.June,
                ],
                [
                  "July",
                  manualPending.July,
                ],
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