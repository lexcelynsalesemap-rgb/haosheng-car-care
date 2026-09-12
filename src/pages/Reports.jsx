import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import gaLogo from "../assets/ga-logo.png";

function Reports() {
  const [jobs, setJobs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [jobServices, setJobServices] = useState([]);

  const [manualPending, setManualPending] = useState({
    June: 7000,
    July: 10000,
    August: 18700,
  });

  const [manualTeyseer, setManualTeyseer] = useState(181200);
  const [savingSetting, setSavingSetting] = useState("");

  const [reportDate, setReportDate] = useState(() => {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Qatar",
    });
  });

  const [alnusoorStartDate, setAlnusoorStartDate] = useState("");
  const [alnusoorEndDate, setAlnusoorEndDate] = useState("");

  const [teyseerStartDate, setTeyseerStartDate] = useState("");
  const [teyseerEndDate, setTeyseerEndDate] = useState("");

  useEffect(() => {
    loadReports();
    loadReportSettings();
  }, []);

  async function loadReports() {
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("*");

    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .select("*");

    const { data: serviceData, error: serviceError } = await supabase
      .from("job_services")
      .select("*");

    if (jobError) console.error("JOB ERROR:", jobError);
    if (paymentError) console.error("PAYMENT ERROR:", paymentError);
    if (serviceError) console.error("SERVICE ERROR:", serviceError);

    setJobs(jobData || []);
    setPayments(paymentData || []);
    setJobServices(serviceData || []);
  }

  async function loadReportSettings() {
    const { data, error } = await supabase
      .from("report_settings")
      .select("*");

    if (error) {
      console.error("REPORT SETTINGS ERROR:", error);
      return;
    }

    if (!data) return;

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
      June: june ? Number(june.amount) || 0 : 7000,
      July: july ? Number(july.amount) || 0 : 10000,
      August: august ? Number(august.amount) || 0 : 18700,
    });

    if (teyseer) {
      setManualTeyseer(Number(teyseer.amount) || 0);
    }
  }

  async function saveSetting(settingName, amount) {
    try {
      setSavingSetting(settingName);

      const numericAmount = Number(amount) || 0;

      const { data: existing, error: findError } = await supabase
        .from("report_settings")
        .select("*")
        .eq("setting_name", settingName)
        .maybeSingle();

      if (findError) {
        console.error("FIND SETTING ERROR:", findError);
        return;
      }

      if (existing) {
        const { error } = await supabase
          .from("report_settings")
          .update({
            amount: numericAmount,
          })
          .eq("setting_name", settingName);

        if (error) {
          console.error("UPDATE SETTING ERROR:", error);
          return;
        }
      } else {
        const { error } = await supabase
          .from("report_settings")
          .insert({
            setting_name: settingName,
            amount: numericAmount,
          });

        if (error) {
          console.error("INSERT SETTING ERROR:", error);
        }
      }
    } finally {
      setSavingSetting("");
    }
  }

  function changeJune(value) {
    const amount = Number(value) || 0;

    setManualPending(prev => ({
      ...prev,
      June: amount,
    }));

    saveSetting("June Pending", amount);
  }

  function changeJuly(value) {
    const amount = Number(value) || 0;

    setManualPending(prev => ({
      ...prev,
      July: amount,
    }));

    saveSetting("July Pending", amount);
  }

  function changeAugust(value) {
    const amount = Number(value) || 0;

    setManualPending(prev => ({
      ...prev,
      August: amount,
    }));

    saveSetting("August Pending", amount);
  }

  function changeTeyseer(value) {
    const amount = Number(value) || 0;

    setManualTeyseer(amount);
    saveSetting("Previous Teyseer", amount);
  }

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
      method.includes("debit card")
    );
  }

  function isBankTransfer(payment) {
    const method = getPaymentMethod(payment);

    return (
      method.includes("bank") ||
      method.includes("transfer")
    );
  }

  const cashPaid = payments
    .filter(isCash)
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  const cardPaid = payments
    .filter(isCard)
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  const bankTransferPaid = payments
    .filter(isBankTransfer)
    .reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  const dailyPayments = {};

  payments.forEach(payment => {
    if (!payment.payment_date) return;

    const date = String(payment.payment_date).slice(0, 10);

    if (!dailyPayments[date]) {
      dailyPayments[date] = {
        cash: 0,
        visa: 0,
        mastercard: 0,
        bankTransfer: 0,
        other: 0,
        total: 0,
      };
    }

    const amount = Number(payment.amount || 0);
    const method = getPaymentMethod(payment);

    dailyPayments[date].total += amount;

    if (isCash(payment)) {
      dailyPayments[date].cash += amount;
    } else if (method.includes("visa")) {
      dailyPayments[date].visa += amount;
    } else if (
      method.includes("mastercard") ||
      method.includes("master card")
    ) {
      dailyPayments[date].mastercard += amount;
    } else if (isBankTransfer(payment)) {
      dailyPayments[date].bankTransfer += amount;
    } else {
      dailyPayments[date].other += amount;
    }
  });

  const dailyPaymentRows = Object.entries(dailyPayments).sort(
    ([dateA], [dateB]) =>
      dateB.localeCompare(dateA)
  );

  const selectedDatePayments = payments.filter(payment => {
    if (!payment.payment_date) return false;

    return (
      String(payment.payment_date).slice(0, 10) ===
      reportDate
    );
  });

  const selectedDatePaymentTotal =
    selectedDatePayments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

  const teyseerSources = [
    "Teyseer Motors",
    "Teyseer Motors - Bahaa",
    "Teyseer Motors - Salah",
  ];

 const teyseerJobs = jobs.filter(job => {
  if (!teyseerSources.includes(job.source)) {
    return false;
  }

  const services = getTeyseerServices(job);

  return services.some(service => {
    const serviceName = String(
      service?.service_name ||
      service?.name ||
      service?.title ||
      ""
    ).toLowerCase();

    return serviceName.includes("full wtt");
  });
});

  const customerJobs = jobs.filter(
    job =>
      !teyseerSources.includes(job.source)
  );

  function getDateString(date) {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getJobDate(job) {
    const possibleDate =
      job.created_at ||
      job.job_date ||
      job.date ||
      job.createdDate;

    if (!possibleDate) return null;

    const date = new Date(possibleDate);

    if (isNaN(date.getTime())) return null;

    return date.toLocaleDateString("en-CA", {
      timeZone: "Asia/Qatar",
    });
  }

  function getTeyseerReportSource(job, service) {
    const serviceName = String(
      service?.service_name ||
        service?.name ||
        service?.title ||
        ""
    ).toLowerCase();

    if (job.source === "Teyseer Motors") {
      return "Teyseer Motors";
    }

    if (job.source === "Teyseer Motors - Salah") {
      if (serviceName.includes("full wtt")) {
        return "Teyseer Motors";
      }

      return "Salah";
    }

    if (job.source === "Teyseer Motors - Bahaa") {
      if (serviceName.includes("full wtt")) {
        return "Teyseer Motors";
      }

      return "Bahaa";
    }

    return "Teyseer Motors";
  }

  function getTeyseerServices(job) {
    return jobServices.filter(
      service =>
        String(service.job_id) ===
        String(job.id)
    );
  }

  function getTeyseerJobAmount(job) {
  const services = getTeyseerServices(job);

  // If there are no service records, don't include the job
  if (services.length === 0) {
    return 0;
  }

  return services.reduce((sum, service) => {
    const serviceName = String(
      service.service_name ||
      service.name ||
      service.title ||
      ""
    ).toLowerCase();

    // ONLY WTT is included in Teyseer report
    if (!serviceName.includes("wtt")) {
      return sum;
    }

    return sum + Number(service.price || 0);
  }, 0);
}

function getTeyseerServiceNames(job) {
  const services = getTeyseerServices(job);

  return services
    .filter(service => {
      const serviceName = String(
        service.service_name ||
        service.name ||
        service.title ||
        ""
      ).toLowerCase();

      // ONLY show WTT services
      return serviceName.includes("wtt");
    })
    .map(service =>
      service.service_name ||
      service.name ||
      service.title ||
      ""
    )
    .filter(Boolean)
    .join(", ");
}

  const teyseerSales = teyseerJobs.reduce(
    (sum, job) =>
      sum + getTeyseerJobAmount(job),
    0
  );

  const customerSales = customerJobs.reduce(
    (sum, job) =>
      sum +
      Number(job.price || 0) -
      Number(job.discount || 0),
    0
  );

  const customerIds = customerJobs.map(job => job.id);

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
        sum + Number(payment.amount || 0),
      0
    );

  const customerBalance =
    customerSales - customerPaid;

  const today = new Date().toLocaleDateString(
    "en-CA",
    {
      timeZone: "Asia/Qatar",
    }
  );

  const carsToday = jobs.filter(
    job =>
      getJobDate(job) === today
  ).length;

  const currentDate = new Date();

  const startOfWeek = new Date(currentDate);

  const day = startOfWeek.getDay();

  const difference =
    day === 0
      ? 6
      : day - 1;

  startOfWeek.setDate(
    startOfWeek.getDate() - difference
  );

  startOfWeek.setHours(
    0,
    0,
    0,
    0
  );

  const weekStart =
    getDateString(startOfWeek);

  const carsThisWeek = jobs.filter(job => {
    const jobDate = getJobDate(job);

    return (
      jobDate &&
      jobDate >= weekStart &&
      jobDate <= today
    );
  }).length;

  const startOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );

  const monthStart =
    getDateString(startOfMonth);

  const carsThisMonth = jobs.filter(job => {
    const jobDate = getJobDate(job);

    return (
      jobDate &&
      jobDate >= monthStart &&
      jobDate <= today
    );
  }).length;

  const dailyCars = {};

  jobs.forEach(job => {
    const date = getJobDate(job);

    if (!date) return;

    if (!dailyCars[date]) {
      dailyCars[date] = 0;
    }

    dailyCars[date]++;
  });

  const dailyCarRows =
    Object.entries(dailyCars).sort(
      ([dateA], [dateB]) =>
        dateB.localeCompare(dateA)
    );

  const alnusoorJobs = jobs.filter(job => {
    const customer = String(
      job.customer || ""
    )
      .toLowerCase()
      .trim();

    const isAlnusoor =
      customer.includes("al nusoor") ||
      customer.includes("alnusoor");

    if (!isAlnusoor) return false;

    const jobDate = getJobDate(job);

    if (
      alnusoorStartDate &&
      jobDate &&
      jobDate < alnusoorStartDate
    ) {
      return false;
    }

    if (
      alnusoorEndDate &&
      jobDate &&
      jobDate > alnusoorEndDate
    ) {
      return false;
    }

    return true;
  });

  const alnusoorAmount = alnusoorJobs.reduce(
    (sum, job) =>
      sum + Number(job.price || 0),
    0
  );

  const alnusoorDiscount = alnusoorJobs.reduce(
    (sum, job) =>
      sum + Number(job.discount || 0),
    0
  );

  const alnusoorNet = Math.max(
    alnusoorAmount -
    alnusoorDiscount,
    0
  );

 const filteredTeyseerJobs = teyseerJobs.filter(job => {
  const amount = getTeyseerJobAmount(job);

  if (amount <= 0) {
    return false;
  }

  const jobDate = getJobDate(job);

  if (
    teyseerStartDate &&
    jobDate &&
    jobDate < teyseerStartDate
  ) {
    return false;
  }

  if (
    teyseerEndDate &&
    jobDate &&
    jobDate > teyseerEndDate
  ) {
    return false;
  }

  return true;
});

  const filteredTeyseerSales =
    filteredTeyseerJobs.reduce(
      (sum, job) =>
        sum + getTeyseerJobAmount(job),
      0
    );

  function printAlnusoorReport() {
    if (alnusoorJobs.length === 0) {
      alert("No Al Nusoor jobs found.");
      return;
    }

    const rows = alnusoorJobs
      .map(job => {
        const price = Number(job.price || 0);
        const discount = Number(job.discount || 0);

        const total = Math.max(
          price - discount,
          0
        );

        return `
          <tr>
            <td>${getJobDate(job) || "-"}</td>
            <td>${job.customer || "-"}</td>
            <td>${job.carMake || job.carType || job.carModel || "-"}</td>
            <td>${job.plate || "-"}</td>

            <td class="money">
              ${price.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </td>

            <td class="money">
              ${discount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </td>

            <td class="money">
              ${total.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </td>
          </tr>
        `;
      })
      .join("");

    const printWindow = window.open(
      "",
      "_blank",
      "width=1000,height=1000"
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
            size: A4 portrait;
            margin: 12mm;
          }

          body {
            font-family: Arial, sans-serif;
            color: #000;
            font-size: 12px;
            margin: 0;
            padding: 10px;
          }

          .header {
            display: flex;
            gap: 18px;
            margin-bottom: 25px;
          }

          .logo {
            width: 105px;
            height: 105px;
            object-fit: contain;
          }

          .companyInfo {
            padding-top: 8px;
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

          .info {
            margin-bottom: 25px;
          }

          .infoRow {
            display: flex;
            margin-bottom: 10px;
          }

          .label {
            width: 145px;
            font-weight: bold;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            text-align: left;
            padding: 9px 7px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
          }

          td {
            padding: 8px 7px;
            border-bottom: 1px solid #d1d5db;
          }

          .money {
            text-align: right;
          }

          .totals {
            margin-top: 25px;
          }

          .totalRow {
            display: flex;
            margin-bottom: 10px;
          }

          .totalLabel {
            width: 145px;
            font-weight: bold;
          }

          .net {
            font-size: 14px;
            font-weight: bold;
          }

          .footer {
            margin-top: 55px;
            padding-top: 12px;
            border-top: 1px solid #000;
            text-align: center;
            font-size: 9px;
            line-height: 1.6;
          }
        </style>
      </head>

      <body>

        <div class="header">

          <img
            src="${gaLogo}"
            class="logo"
            alt="Haosheng Logo"
          />

          <div class="companyInfo">

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

        <div class="info">

          <div class="infoRow">
            <div class="label">DATE:</div>
            <div>${alnusoorEndDate || reportDate}</div>
          </div>

          <div class="infoRow">
            <div class="label">NAME/COMPANY:</div>
            <div>AL NUSOOR CENTER</div>
          </div>

          <div class="infoRow">
            <div class="label">ADDRESS:</div>
            <div>SALWA ROAD</div>
          </div>

          <div class="infoRow">
            <div class="label">CONTACT NUMBER:</div>
            <div>30124444</div>
          </div>

        </div>

        <table>

          <thead>
            <tr>
              <th>DATE</th>
              <th>CUSTOMER</th>
              <th>CAR</th>
              <th>PLATE</th>
              <th class="money">PRICE</th>
              <th class="money">DISCOUNT</th>
              <th class="money">TOTAL</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>

        </table>

        <div class="totals">

          <div class="totalRow">
            <div class="totalLabel">AMOUNT:</div>
            <div>
              ${alnusoorAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div class="totalRow">
            <div class="totalLabel">TOTAL DISCOUNT:</div>
            <div>
              ${alnusoorDiscount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div class="totalRow net">
            <div class="totalLabel">NET AMOUNT:</div>
            <div>
              ${alnusoorNet.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

        </div>

        <div style="margin-top:25px;">
          <strong>PAYMENT METHOD:</strong>
          <br />
          CASH / VISA / MASTERCARD / AMEX / NAPS
        </div>

        <div class="footer">

          <strong>
            Tel: +974 4441 5866
            &nbsp;-&nbsp;
            C.R.NO: 199725
            &nbsp;-&nbsp;
            E-mail: info@haoshengcar.com
          </strong>

          <br />

          Fereej Al Manaseer, Zone 55,
          St. 340, Bldg 358,
          Salwa Road, Doha, Qatar

        </div>

      </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = function () {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  }

  function printTeyseerReport() {
    if (filteredTeyseerJobs.length === 0) {
      alert("No Teyseer jobs found.");
      return;
    }

    const reportRows = filteredTeyseerJobs
      .map((job, index) => {
        const amount = getTeyseerJobAmount(job);
        const serviceNames =
          getTeyseerServiceNames(job);

        return `
          <tr>

            <td class="center">
              ${index + 1}
            </td>

            <td>
              ${getJobDate(job) || "-"}
            </td>

            <td>
              ${job.carMake ||
                job.carType ||
                job.carModel ||
                "-"}
            </td>

            <td>
              ${job.plate || "-"}
            </td>

            <td>
              ${serviceNames || "-"}
            </td>

            <td>
              ${job.voucherNumber || "-"}
            </td>

            <td>
              ${job.receipt_number || "-"}
            </td>

            <td class="money">
              QAR ${amount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </td>

          </tr>
        `;
      })
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

        <style>

          * {
            box-sizing: border-box;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          body {
            font-family: Arial, sans-serif;
            color: #000;
            margin: 0;
            padding: 15px;
            font-size: 10px;
          }

          /*
            TEYSEER HEADER
            Matches the header you provided:
            
            HAOSHENG CAR SERVICE AND ACCESSORIES
            هاوشنغ لخدمات وزينة السيارات
            Building 358, Salwa Road, Doha - Qatar

            INVOICE
            DATE
            INVOICE NO.
            NAME/COMPANY
            ADDRESS
            CONTACT NUMBER
          */

          .invoiceHeader {
            width: 100%;
            margin-bottom: 20px;
          }

          .topHeader {
            display: flex;
            width: 100%;
            min-height: 125px;
          }

          .logoSection {
            width: 22%;
            display: flex;
            align-items: flex-start;
            justify-content: flex-start;
          }

          .logo {
            width: 115px;
            height: 105px;
            object-fit: contain;
          }

          .companySection {
            width: 48%;
            padding-top: 5px;
          }

          .companyName {
            font-size: 17px;
            font-weight: bold;
            margin-bottom: 9px;
          }

          .arabicName {
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 9px;
          }

          .companyAddress {
            font-size: 11px;
          }

          .invoiceSection {
            width: 30%;
            text-align: center;
            padding-top: 5px;
          }

          .invoiceWord {
            font-size: 19px;
            font-weight: bold;
            margin-bottom: 18px;
          }

          .invoiceDetails {
            width: 100%;
            font-size: 10px;
          }

          .invoiceDetailsRow {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          .invoiceLabel {
            font-weight: bold;
          }

          .customerInfo {
            width: 70%;
            margin-top: 5px;
            margin-bottom: 18px;
          }

          .customerRow {
            display: flex;
            margin-bottom: 9px;
          }

          .customerLabel {
            width: 145px;
            font-weight: bold;
          }

          .customerValue {
            flex: 1;
          }

          .period {
            font-size: 10px;
            margin-bottom: 15px;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 18px;
          }

          .box {
            border: 1px solid #999;
            padding: 9px;
          }

          .boxLabel {
            font-size: 9px;
            margin-bottom: 4px;
          }

          .boxValue {
            font-size: 14px;
            font-weight: bold;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 8.5px;
          }

          th {
            background: #111827;
            color: white;
            padding: 7px 4px;
            text-align: left;
            border: 1px solid #111827;
          }

          td {
            padding: 6px 4px;
            border: 1px solid #d1d5db;
            vertical-align: top;
            word-wrap: break-word;
          }

          tr:nth-child(even) {
            background: #f8fafc;
          }

          .center {
            text-align: center;
          }

          .money {
            text-align: right;
            white-space: nowrap;
          }

          .totals {
            margin-top: 15px;
            margin-left: auto;
            width: 280px;
          }

          .totalRow {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #d1d5db;
          }

          .totalLabel {
            font-weight: bold;
          }

          .netAmount {
            font-size: 13px;
            font-weight: bold;
          }
.paymentSection {
  margin-top: 25px;
  padding-top: 12px;
  border-top: 1px solid #000;
}

.paymentTitle {
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 8px;
}

.paymentMethods {
  font-size: 10px;
  font-weight: bold;
}

.signatureSection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  margin-top: 70px;
  margin-bottom: 35px;
}

.signatureBox {
  text-align: center;
  min-height: 60px;
}

.arabicSignature {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
}

.englishSignature {
  font-size: 10px;
  font-weight: bold;
  padding-top: 8px;
  border-top: 1px solid #000;
}
          .footer {
            margin-top: 25px;
            padding-top: 9px;
            border-top: 1px solid #000;
            text-align: center;
            font-size: 8px;
            line-height: 1.5;
          }

          @media print {

            body {
              padding: 5px;
            }

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

        <!-- ========================= -->
        <!-- TEYSEER INVOICE HEADER -->
        <!-- ========================= -->

        <div class="invoiceHeader">

          <div class="topHeader">

            <div class="logoSection">

              <img
                src="${gaLogo}"
                class="logo"
                alt="Haosheng Logo"
              />

            </div>

            <div class="companySection">

              <div class="companyName">
                HAOSHENG CAR SERVICE AND ACCESSORIES
              </div>

              <div class="arabicName">
                هاوشنغ لخدمات وزينة السيارات
              </div>

              <div class="companyAddress">
                Building 358, Salwa Road, Doha - Qatar
              </div>

            </div>

            <div class="invoiceSection">

              <div class="invoiceWord">
                INVOICE
              </div>

              <div class="invoiceDetails">

                <div class="invoiceDetailsRow">

                  <span class="invoiceLabel">
                    DATE:
                  </span>

                  <span>
                    ${teyseerEndDate || reportDate}
                  </span>

                </div>

                <div class="invoiceDetailsRow">

                  <span class="invoiceLabel">
                    INVOICE NO.
                  </span>

                  <span>
                    0006
                  </span>

                </div>

              </div>

            </div>

          </div>

          <div class="customerInfo">

            <div class="customerRow">

              <div class="customerLabel">
                NAME/COMPANY:
              </div>

              <div class="customerValue">
                TEYSEER MOTORS CO. WLL.
              </div>

            </div>

            <div class="customerRow">

              <div class="customerLabel">
                ADDRESS:
              </div>

              <div class="customerValue">
                AIRPORT St. DOHA, QATAR
              </div>

            </div>

            <div class="customerRow">

              <div class="customerLabel">
                CONTACT NUMBER:
              </div>

              <div class="customerValue">
                50900458
              </div>

            </div>

          </div>

        </div>

        <!-- ========================= -->
        <!-- REPORT -->
        <!-- ========================= -->

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
              QAR ${filteredTeyseerSales.toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </div>

          </div>

        </div>

        <table>

          <thead>

            <tr>

              <th style="width:4%;">
                #
              </th>

              <th style="width:9%;">
                DATE
              </th>

              <th style="width:12%;">
                CAR
              </th>

              <th style="width:9%;">
                PLATE
              </th>

              <th style="width:28%;">
                SERVICES
              </th>

              <th style="width:12%;">
                VOUCHER NO.
              </th>

              <th style="width:12%;">
                RECEIPT NO.
              </th>

              <th style="width:14%;">
                NET AMOUNT
              </th>

            </tr>

          </thead>

          <tbody>

            ${reportRows}

          </tbody>

        </table>

        <div class="totals">

          <div class="totalRow netAmount">

            <span class="totalLabel">
              NET AMOUNT
            </span>

            <span>
              QAR ${filteredTeyseerSales.toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </span>

          </div>

        </div>

     <div class="paymentSection">

  <div class="paymentTitle">
    PAYMENT METHOD:
  </div>

  <div class="paymentMethods">
    CASH / VISA / MASTERCARD / AMEX / NAPS / BANK TRANSFER
  </div>

</div>

<div class="signatureSection">

  <div class="signatureBox">

    <div class="arabicSignature">
      توقيع العميل
    </div>

    <div class="englishSignature">
      CUSTOMER'S SIGNATURE
    </div>

  </div>

  <div class="signatureBox">

    <div class="arabicSignature">
      توقيع المعتمد
    </div>

    <div class="englishSignature">
      AUTHORIZED SIGNATURE
    </div>

  </div>

</div>

<div class="footer">

  Tel: +974 4441 5866
  &nbsp; | &nbsp;
  C.R.NO: 199725
  &nbsp; | &nbsp;
  E-mail: info@haoshengcar.com

  <br />

  Fereej Al Manaseer, Zone 55,
  St. 340, Bldg 358,
  Salwa Road, Doha, Qatar

</div>

      </body>

      </html>
    `);

    printWindow.document.close();

    printWindow.onload = function () {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  }

  function printDailyReport() {
    const selectedDate = reportDate;

    const todayJobs = jobs.filter(
      job =>
        getJobDate(job) === selectedDate
    );

    const selectedPayments =
      payments.filter(payment =>
        payment.payment_date &&
        String(payment.payment_date).slice(0, 10) ===
          selectedDate
      );

    if (
      todayJobs.length === 0 &&
      selectedPayments.length === 0
    ) {
      alert(
        `No cars or payments found for ${selectedDate}.`
      );

      return;
    }

    const totalSales = todayJobs.reduce(
      (sum, job) =>
        sum +
        Number(job.price || 0) -
        Number(job.discount || 0),
      0
    );

    const totalPaid = selectedPayments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

    const totalBalance =
      totalSales - totalPaid;

    const reportRows = todayJobs
      .map((job, index) => {
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
              Number(payment.amount || 0),
            0
          );

        const price =
          Number(job.price || 0);

        const discount =
          Number(job.discount || 0);

        const netAmount =
          price - discount;

        const jobBalance =
          netAmount - jobPaid;

        let services = "No services";

        if (Array.isArray(job.services)) {
          services = job.services
            .map(service => {
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
            })
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
  <td>${job.customer || ""}</td>
  <td>${job.phone || ""}</td>
  <td>${job.carModel || ""}</td>
  <td>${job.plate || ""}</td>
  <td>${job.source || "Not specified"}</td>
  <td>${services}</td>

  <td class="money">
    QAR ${price.toLocaleString()}
  </td>

  <td class="money">
    QAR ${discount.toLocaleString()}
  </td>

  <td class="money">
    QAR ${jobPaid.toLocaleString()}
  </td>

  <td class="money">
    QAR ${jobBalance.toLocaleString()}
  </td>
</tr>
        `;
      })
      .join("");

    const paymentRows =
      selectedPayments
        .map(payment => {
          const method =
            payment.payment_method ||
            payment.method ||
            payment.type ||
            "Unknown";

          return `
            <tr>

              <td>
                ${payment.payment_date || ""}
              </td>

              <td>
                ${method}
              </td>

              <td class="money">
                QAR ${Number(
                  payment.amount || 0
                ).toLocaleString()}
              </td>

            </tr>
          `;
        })
        .join("");

    const printWindow = window.open(
      "",
      "_blank",
      "width=1500,height=900"
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
          }

          .date {
            color: #64748b;
            margin: 5px 0 25px;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
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

          h2 {
            margin-top: 30px;
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
            text-align: left;
          }

          td {
            padding: 8px 6px;
            border: 1px solid #d1d5db;
          }

          .money {
            text-align: right;
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
          Daily Workshop Report
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
              PAYMENTS TODAY
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
  <th>Amount</th>
  <th>Discount</th>
  <th>Paid</th>
  <th>Balance</th>
</tr>

          </thead>

          <tbody>
            ${reportRows}
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

    printWindow.onload = function () {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  }

  return (
    <div
      style={{
        padding: "30px",
        background: "#f1f5f9",
        minHeight: "100vh",
      }}
    >

      <h1>
        Reports
      </h1>

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
          }}
        >
          Report Date:
        </label>

        <input
          type="date"
          value={reportDate}
          onChange={e =>
            setReportDate(e.target.value)
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

      <h2>
        Financial Summary
      </h2>

      <div style={gridStyle}>

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

      <h2>
        Payment Methods
      </h2>

      <div style={gridStyle}>

        <FinancialCard
          title="Cash"
          value={cashPaid}
          color="#16a34a"
          icon="💵"
        />

        <FinancialCard
          title="Card"
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

      </div>

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
          QAR {selectedDatePaymentTotal.toLocaleString()}
        </h1>

        <p>
          {selectedDatePayments.length} payment
          {selectedDatePayments.length === 1
            ? ""
            : "s"} received
        </p>

      </div>

      <div style={whiteCardStyle}>

        {dailyPaymentRows.length === 0 ? (
          <p>
            No payment records found.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>

            <table style={tableStyle}>

              <thead>

                <tr>

                  <th style={tableHeader}>
                    Date
                  </th>

                  <th style={tableHeader}>
                    Cash
                  </th>

                  <th style={tableHeader}>
                    Visa
                  </th>

                  <th style={tableHeader}>
                    Mastercard
                  </th>

                  <th style={tableHeader}>
                    Bank Transfer
                  </th>

                  <th style={tableHeader}>
                    Other
                  </th>

                  <th style={tableHeader}>
                    Total
                  </th>

                </tr>

              </thead>

              <tbody>

                {dailyPaymentRows.map(
                  ([date, values]) => (
                    <tr key={date}>

                      <td style={tableCell}>
                        {date}
                      </td>

                      <td style={tableCell}>
                        QAR {values.cash.toLocaleString()}
                      </td>

                      <td style={tableCell}>
                        QAR {values.visa.toLocaleString()}
                      </td>

                      <td style={tableCell}>
                        QAR {values.mastercard.toLocaleString()}
                      </td>

                      <td style={tableCell}>
                        QAR {values.bankTransfer.toLocaleString()}
                      </td>

                      <td style={tableCell}>
                        QAR {values.other.toLocaleString()}
                      </td>

                      <td
                        style={{
                          ...tableCell,
                          fontWeight: "bold",
                          color: "#16a34a",
                        }}
                      >
                        QAR {values.total.toLocaleString()}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      <h2>
        Previous Month Pending
      </h2>

      <div style={gridStyle}>

        <ManualCard
          title="June Pending"
          value={manualPending.June}
          saving={savingSetting === "June Pending"}
          onChange={changeJune}
        />

        <ManualCard
          title="July Pending"
          value={manualPending.July}
          saving={savingSetting === "July Pending"}
          onChange={changeJuly}
        />

        <ManualCard
          title="August Pending"
          value={manualPending.August}
          saving={savingSetting === "August Pending"}
          onChange={changeAugust}
        />

      </div>

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
          onChange={e =>
            changeTeyseer(e.target.value)
          }
          style={{
            ...inputStyle,
            width: "350px",
            maxWidth: "100%",
          }}
        />

        {savingSetting === "Previous Teyseer" && (
          <p style={{ color: "#16a34a" }}>
            Saving...
          </p>
        )}

        <h2 style={{ color: "#9333ea" }}>
          QAR {manualTeyseer.toLocaleString()}
        </h2>

      </div>

      <h2>
        Car Reports
      </h2>

      <div style={gridStyle}>

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

      <h2>
        Cars Received Per Day
      </h2>

      <div style={whiteCardStyle}>

        {dailyCarRows.length === 0 ? (
          <p>
            No car records found.
          </p>
        ) : (
          <table style={tableStyle}>

            <thead>

              <tr>

                <th style={tableHeader}>
                  Date
                </th>

                <th style={tableHeader}>
                  Cars Received
                </th>

              </tr>

            </thead>

            <tbody>

              {dailyCarRows.map(
                ([date, count]) => (
                  <tr key={date}>

                    <td style={tableCell}>
                      {date}
                    </td>

                    <td style={tableCell}>
                      🚗 {count}
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>
        )}

      </div>

      <h2>
        Source Reports
      </h2>

      <div style={gridStyle}>

        <div style={sourceCardStyle}>

          <h2>
            Teyseer
          </h2>

          <p>
            Cars: {teyseerJobs.length}
          </p>

          <p>
            Net Amount: QAR {teyseerSales.toLocaleString()}
          </p>

        </div>

        <div style={sourceCardStyle}>

          <h2>
            Customers / Other
          </h2>

          <p>
            Cars: {customerJobs.length}
          </p>

          <p>
            Sales: QAR {customerSales.toLocaleString()}
          </p>

          <p>
            Paid: QAR {customerPaid.toLocaleString()}
          </p>

          <p>
            Balance: QAR {customerBalance.toLocaleString()}
          </p>

        </div>

      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(400px,1fr))",
          gap: "25px",
          marginBottom: "30px",
        }}
      >

        {/* AL NUSOOR */}

        <div
          style={{
            ...whiteCardStyle,
            borderTop: "5px solid #d4af37",
          }}
        >

          <h2>
            Al Nusoor Report
          </h2>

          <p style={{ color: "#64748b" }}>
            Al Nusoor is detected automatically from
            the Customer field.
          </p>

          <div style={filterStyle}>

            <div>

              <label style={labelStyle}>
                From Date
              </label>

              <input
                type="date"
                value={alnusoorStartDate}
                onChange={e =>
                  setAlnusoorStartDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />

            </div>

            <div>

              <label style={labelStyle}>
                To Date
              </label>

              <input
                type="date"
                value={alnusoorEndDate}
                onChange={e =>
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
              marginBottom: "20px",
            }}
          >

            <button
              onClick={printAlnusoorReport}
              style={darkButton}
            >
              Print Al Nusoor
            </button>

            <button
              onClick={() => {
                setAlnusoorStartDate("");
                setAlnusoorEndDate("");
              }}
              style={clearButton}
            >
              Clear
            </button>

          </div>

          <div style={miniGrid}>

            <MiniBox
              title="Cars"
              value={alnusoorJobs.length}
            />

            <MiniBox
              title="Amount"
              value={`QAR ${alnusoorAmount.toLocaleString()}`}
            />

            <MiniBox
              title="Discount"
              value={`QAR ${alnusoorDiscount.toLocaleString()}`}
            />

            <MiniBox
              title="Net"
              value={`QAR ${alnusoorNet.toLocaleString()}`}
            />

          </div>

          {alnusoorJobs.length === 0 ? (
            <p>
              No Al Nusoor jobs found.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>

              <table style={tableStyle}>

                <thead>

                  <tr>

                    <th style={tableHeader}>
                      Date
                    </th>

                    <th style={tableHeader}>
                      Customer
                    </th>

                    <th style={tableHeader}>
                      Car
                    </th>

                    <th style={tableHeader}>
                      Plate
                    </th>

                    <th style={tableHeader}>
                      Total
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {alnusoorJobs.map(job => {

                    const price =
                      Number(job.price || 0);

                    const discount =
                      Number(job.discount || 0);

                    const total =
                      Math.max(
                        price - discount,
                        0
                      );

                    return (
                      <tr key={job.id}>

                        <td style={tableCell}>
                          {getJobDate(job) || "-"}
                        </td>

                        <td style={tableCell}>
                          {job.customer || "-"}
                        </td>

                        <td style={tableCell}>
                          {job.carMake ||
                            job.carType ||
                            job.carModel ||
                            "-"}
                        </td>

                        <td style={tableCell}>
                          {job.plate || "-"}
                        </td>

                        <td style={tableCell}>
                          QAR {total.toLocaleString()}
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* TEYSEER */}

        <div
          style={{
            ...whiteCardStyle,
            borderTop: "5px solid #9333ea",
          }}
        >

          <h2>
            Teyseer Report
          </h2>

          <p style={{ color: "#64748b" }}>
            Teyseer Motors, Bahaa and Salah jobs
            are included automatically.
          </p>

          <div style={filterStyle}>

            <div>

              <label style={labelStyle}>
                From Date
              </label>

              <input
                type="date"
                value={teyseerStartDate}
                onChange={e =>
                  setTeyseerStartDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />

            </div>

            <div>

              <label style={labelStyle}>
                To Date
              </label>

              <input
                type="date"
                value={teyseerEndDate}
                onChange={e =>
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
              marginBottom: "20px",
            }}
          >

            <button
              onClick={printTeyseerReport}
              style={{
                ...darkButton,
                background: "#9333ea",
              }}
            >
              Print Teyseer
            </button>

            <button
              onClick={() => {
                setTeyseerStartDate("");
                setTeyseerEndDate("");
              }}
              style={clearButton}
            >
              Clear
            </button>

          </div>

          <div style={miniGrid}>

            <MiniBox
              title="Cars"
              value={filteredTeyseerJobs.length}
            />

            <MiniBox
              title="Net Amount"
              value={`QAR ${filteredTeyseerSales.toLocaleString()}`}
            />

          </div>

          {filteredTeyseerJobs.length === 0 ? (
            <p>
              No Teyseer jobs found.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>

              <table style={tableStyle}>

                <thead>

                  <tr>

                    <th style={tableHeader}>
                      Date
                    </th>

                    <th style={tableHeader}>
                      Car
                    </th>

                    <th style={tableHeader}>
                      Plate
                    </th>

                    <th style={tableHeader}>
                      Services
                    </th>

                    <th style={tableHeader}>
                      Voucher No.
                    </th>

                    <th style={tableHeader}>
                      Receipt No.
                    </th>

                    <th style={tableHeader}>
                      Net Amount
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredTeyseerJobs.map(job => {

                    const amount =
                      getTeyseerJobAmount(job);

                    return (
                      <tr key={job.id}>

                        <td style={tableCell}>
                          {getJobDate(job) || "-"}
                        </td>

                        <td style={tableCell}>
                          {job.carMake ||
                            job.carType ||
                            job.carModel ||
                            "-"}
                        </td>

                        <td style={tableCell}>
                          {job.plate || "-"}
                        </td>

                        <td style={tableCell}>
                          {getTeyseerServiceNames(job) || "-"}
                        </td>

                        <td style={tableCell}>
                          {job.voucherNumber || "-"}
                        </td>

                        <td style={tableCell}>
                          {job.receipt_number || "-"}
                        </td>

                        <td style={tableCell}>
                          QAR {amount.toLocaleString()}
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

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
          : `QAR ${Number(value).toLocaleString()}`}
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
        onChange={e =>
          onChange(e.target.value)
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

      <h2 style={{ color: "#dc2626" }}>
        QAR {Number(value).toLocaleString()}
      </h2>

    </div>
  );
}

function MiniBox({ title, value }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        padding: "15px",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
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
  border: "1px solid #cbd5e1",
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
  borderCollapse: "collapse",
};

const tableHeader = {
  textAlign: "left",
  padding: "12px",
  background: "#f8fafc",
  borderBottom: "2px solid #e2e8f0",
};

const tableCell = {
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
};

export default Reports;