
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabase/client.js";

// -----------------------------------
// JOBS PAGE TRANSLATIONS
// -----------------------------------

const jobsTranslations = {
  ar: {
    "Jobs": "الطلبات",
    "Loading jobs...": "جارٍ تحميل الطلبات...",
    "Search customer, phone, plate, car...": "ابحث عن العميل أو الهاتف أو رقم اللوحة أو السيارة...",
    "All Status": "جميع الحالات",
    "All Sources": "جميع المصادر",
    "All": "الكل",
    "New": "جديد",
    "In Progress": "قيد التنفيذ",
    "Finished": "مكتمل",
    "Delivered": "تم التسليم",
    "No jobs found": "لم يتم العثور على طلبات",
    "Phone": "الهاتف",
    "Vehicle": "السيارة",
    "Plate": "رقم اللوحة",
    "Services": "الخدمات",
    "No services": "لا توجد خدمات",
    "Balance": "الرصيد المستحق",
    "Source": "المصدر",
    "Not specified": "غير محدد",
    "Edit": "تعديل",
    "Assign Technician": "تعيين فني",
    "Invoice": "الفاتورة",
    "Delete": "حذف",
    "Are you sure you want to delete this job?": "هل أنت متأكد أنك تريد حذف هذا الطلب؟",
    "Job Deleted": "تم حذف الطلب",
    "Teyseer Motors": "تيسير موتورز",
    "Teyseer Motors - Bahaa": "تيسير موتورز - بهاء",
    "Teyseer Motors - Salah": "تيسير موتورز - صلاح",
    "Teyseer Motors - Abdou": "تيسير موتورز - عبدو",
    "Bahaa": "بهاء",
    "Salah": "صلاح",
    "Walk-in": "عميل مباشر",
    "Other": "أخرى",
    "QAR": "ريال قطري"
  },

  zh: {
    "Jobs": "工单",
    "Loading jobs...": "正在加载工单...",
    "Search customer, phone, plate, car...": "搜索客户、电话、车牌或车型...",
    "All Status": "全部状态",
    "All Sources": "全部来源",
    "All": "全部",
    "New": "新建",
    "In Progress": "进行中",
    "Finished": "已完成",
    "Delivered": "已交车",
    "No jobs found": "没有找到工单",
    "Phone": "电话",
    "Vehicle": "车型",
    "Plate": "车牌号",
    "Services": "服务项目",
    "No services": "没有服务项目",
    "Balance": "客户未付余额",
    "Source": "来源",
    "Not specified": "未指定",
    "Edit": "编辑",
    "Assign Technician": "分配技师",
    "Invoice": "发票",
    "Delete": "删除",
    "Are you sure you want to delete this job?": "确定要删除此工单吗？",
    "Job Deleted": "工单已删除",
    "Teyseer Motors": "Teyseer Motors",
    "Teyseer Motors - Bahaa": "Teyseer Motors - Bahaa",
    "Teyseer Motors - Salah": "Teyseer Motors - Salah",
    "Teyseer Motors - Abdou": "Teyseer Motors - Abdou",
    "Bahaa": "Bahaa",
    "Salah": "Salah",
    "Walk-in": "直接客户",
    "Other": "其他",
    "QAR": "卡塔尔里亚尔"
  }
};

function translateJobs(text, language) {
  if (language === "ar" || language === "zh") {
    return jobsTranslations[language][text] || text;
  }

  return text;
}

function Jobs() {
  const { i18n } = useTranslation();

  const language =
    i18n.resolvedLanguage || i18n.language || "en";

  const tr = (text) => translateJobs(text, language);

  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  // -----------------------------------
  // LOAD JOBS FROM DATABASE
  // -----------------------------------

  const loadJobs = useCallback(async () => {
    setLoading(true);

    try {
      const loggedInUser = JSON.parse(
        localStorage.getItem("user")
      );

      console.log("LOGGED IN USER:", loggedInUser);
      console.log("SHOP ID:", loggedInUser?.shop_id);

      if (!loggedInUser?.shop_id) {
        console.error("NO SHOP ID FOUND FOR LOGGED-IN USER");
        setJobs([]);
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("shop_id", loggedInUser.shop_id)
        .order("created_at", {
          ascending: false
        });

      console.log("JOBS DATA:", data);
      console.log("JOBS ERROR:", error);

      if (error) {
        console.error("LOAD JOBS ERROR:", error);
        return;
      }

      setJobs(data || []);

    } catch (error) {
      console.error("LOAD JOBS EXCEPTION:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // -----------------------------------
  // LOAD + REALTIME
  // -----------------------------------

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Reload when returning/focusing browser
  useEffect(() => {
    const handleFocus = () => {
      loadJobs();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadJobs]);

  // Realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("jobs-page-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs"
        },
        () => {
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadJobs]);

  // -----------------------------------
  // UPDATE STATUS
  // -----------------------------------

  async function updateStatus(id, newStatus) {
    const { error } = await supabase
      .from("jobs")
      .update({
        status: newStatus
      })
      .eq("id", id);

    if (error) {
      console.error("UPDATE STATUS ERROR:", error);
      alert(error.message);
      return;
    }

    setJobs((prev) =>
      prev.map((job) =>
        job.id === id
          ? {
              ...job,
              status: newStatus
            }
          : job
      )
    );
  }

  // -----------------------------------
  // DELETE JOB
  // -----------------------------------

  async function deleteJob(id) {
    const confirmDelete = window.confirm(
      tr("Are you sure you want to delete this job?")
    );

    if (!confirmDelete) {
      return;
    }

    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE JOB ERROR:", error);
      alert(error.message);
      return;
    }

    setJobs((prev) =>
      prev.filter((job) => job.id !== id)
    );

    alert(tr("Job Deleted"));
  }

  // -----------------------------------
  // CUSTOMER BALANCE — MATCH INVOICE.JSX
  // -----------------------------------

  function getInvoiceCustomerBalance(job) {
    const source = String(job.source || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

    const isFullTeyseer = source === "teyseer motors";

    const isTeyseer =
      isFullTeyseer ||
      source === "teyseer motors - salah" ||
      source === "teyseer motors-salah" ||
      source === "teyseer-salah" ||
      source === "teyseer motors - bahaa" ||
      source === "teyseer motors-bahaa" ||
      source === "teyseer-bahaa" ||
      source === "teyseer motors - abdou" ||
      source === "teyseer motors-abdou" ||
      source === "teyseer-abdou";

    const services = Array.isArray(job.services)
      ? job.services
      : typeof job.services === "string" && job.services.trim()
      ? [job.services.trim()]
      : [];

    const customerNetAmount = isFullTeyseer
      ? 0
      : services.reduce((total, service) => {
          const serviceName =
            typeof service === "string"
              ? service
              : service?.name ||
                service?.service_name ||
                service?.title ||
                "";

          const details = job.serviceDetails?.[serviceName] || {};
          const isWTT = serviceName.toLowerCase().includes("wtt");

          if (isTeyseer && isWTT) {
            return total;
          }

          const price = Number(details.price) || 0;
          const quantity = Number(details.quantity) || 1;
          const discount = Number(details.discount) || 0;

          return total + Math.max(price * quantity - discount, 0);
        }, 0);

    return Math.max(
      customerNetAmount - (Number(job.deposit) || 0),
      0
    );
  }

  // -----------------------------------
  // FILTER JOBS
  // -----------------------------------

  const filteredJobs = jobs.filter((job) => {
    const text = search.toLowerCase();

    const matchesSearch =
      job.customer?.toLowerCase().includes(text) ||
      job.phone?.toLowerCase().includes(text) ||
      job.plate?.toLowerCase().includes(text) ||
      job.carModel?.toLowerCase().includes(text);

    const matchesStatus =
      statusFilter === "All" ||
      (job.status || "New") === statusFilter;

    const matchesSource =
      sourceFilter === "All" ||
      job.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  // -----------------------------------
  // STATUS OPTIONS
  // -----------------------------------

  const statusOptions = [
    "New",
    "In Progress",
    "Finished",
    "Delivered"
  ];

  // -----------------------------------
  // SOURCE OPTIONS
  // -----------------------------------

  const sourceOptions = [
    "Teyseer Motors",
    "Teyseer Motors - Bahaa",
    "Teyseer Motors - Salah",
    "Teyseer Motors - Abdou",
    "Bahaa",
    "Salah",
    "Walk-in",
    "Other"
  ];

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (loading) {
    return (
      <div style={styles.page}>
        <h1>{tr("Jobs")}</h1>
        <p>{tr("Loading jobs...")}</p>
      </div>
    );
  }

  // -----------------------------------
  // PAGE
  // -----------------------------------

  return (
    <div style={styles.page}>

      <h1>{tr("Jobs")}</h1>

      {/* SEARCH */}

      <input
        style={styles.search}
        placeholder={tr("Search customer, phone, plate, car...")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* STATUS FILTER */}

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        style={styles.filter}
      >
        <option value="All">{tr("All Status")}</option>

        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {tr(status)}
          </option>
        ))}
      </select>

      {/* SOURCE FILTER */}

      <select
        value={sourceFilter}
        onChange={(e) => setSourceFilter(e.target.value)}
        style={styles.filter}
      >
        <option value="All">{tr("All Sources")}</option>

        {sourceOptions.map((source) => (
          <option key={source} value={source}>
            {tr(source)}
          </option>
        ))}
      </select>

      {/* JOBS */}

      {filteredJobs.length === 0 ? (

        <p>{tr("No jobs found")}</p>

      ) : (

        filteredJobs.map((job) => (

          <div
            key={job.id}
            style={styles.jobCard}
          >

            {/* HEADER */}

            <div style={styles.jobHeader}>

              <Link to={`/jobs/${job.id}`}>
                <h2>
                  👤 {job.customer}
                </h2>
              </Link>

              <span
                style={{
                  ...styles.badge,
                  background:
                    job.status === "Finished"
                      ? "#16a34a"
                      : job.status === "Delivered"
                      ? "#0891b2"
                      : job.status === "In Progress"
                      ? "#ea580c"
                      : "#2563eb"
                }}
              >
                {tr(job.status || "New")}
              </span>

            </div>

            {/* CUSTOMER */}

            <p>
              {tr("Phone")}: {job.phone}
            </p>

            <p>
              {tr("Vehicle")}: {job.carModel}
            </p>

            <p>
              {tr("Plate")}: {job.plate}
            </p>

            {/* SERVICES */}

            <div style={styles.infoRow}>

              <strong>{tr("Services")}:</strong>{" "}

              {Array.isArray(job.services)
                ? job.services.length > 0
                  ? job.services
                      .map((service) =>
                        typeof service === "string"
                          ? service
                          : service?.name ||
                            service?.service_name ||
                            service?.title ||
                            ""
                      )
                      .filter(Boolean)
                      .join(", ")
                  : tr("No services")

                : typeof job.services === "string" &&
                  job.services.trim()
                ? job.services
                : tr("No services")}

            </div>

            {/* BALANCE */}

            <p style={styles.money}>
              💰 {tr("Balance")}: {tr("QAR")}{" "}
              {getInvoiceCustomerBalance(job).toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2
                }
              )}
            </p>

            {/* SOURCE */}

            <p>
              {tr("Source")}:{" "}
              {job.source
                ? tr(job.source)
                : tr("Not specified")}
            </p>

            {/* STATUS */}

            <select
              value={job.status || "New"}
              onChange={(e) =>
                updateStatus(job.id, e.target.value)
              }
              style={styles.status}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {tr(status)}
                </option>
              ))}
            </select>

            <br />
            <br />

            {/* BUTTONS */}

            <Link to={`/edit-job/${job.id}`}>
              <button style={styles.editButton}>
                ✏️ {tr("Edit")}
              </button>
            </Link>

            <Link to={`/assign-technician/${job.id}`}>
              <button style={styles.techButton}>
                👷 {tr("Assign Technician")}
              </button>
            </Link>

            <Link to={`/invoice/${job.id}`}>
              <button style={styles.invoiceButton}>
                🧾 {tr("Invoice")}
              </button>
            </Link>

            <button
              style={styles.deleteButton}
              onClick={() => deleteJob(job.id)}
            >
              🗑 {tr("Delete")}
            </button>

          </div>

        ))
      )}

    </div>
  );
}

// -----------------------------------
// STYLES — SAME BLACK & GOLD THEME
// -----------------------------------

const styles = {
  page: {
    minHeight: "100vh",
    padding: "30px",
    background: "#0b0b0b",
    color: "#f5f5f5",
    boxSizing: "border-box"
  },

  search: {
    width: "300px",
    maxWidth: "100%",
    boxSizing: "border-box",
    padding: "13px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #555",
    background: "#222",
    color: "#fff",
    fontSize: "16px"
  },

  filter: {
    padding: "13px",
    marginInlineStart: "10px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #555",
    background: "#222",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer"
  },

  jobCard: {
    background: "#151515",
    padding: "25px",
    marginBottom: "20px",
    borderRadius: "12px",
    border: "1px solid #3b321c",
    boxShadow: "0 8px 20px rgba(0,0,0,0.35)"
  },

  jobHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px"
  },

  badge: {
    color: "#fff",
    padding: "8px 15px",
    borderRadius: "20px",
    fontWeight: "bold"
  },

  infoRow: {
    marginTop: "10px",
    marginBottom: "10px"
  },

  money: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#d4af37"
  },

  status: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #555",
    background: "#222",
    color: "#fff",
    fontSize: "15px",
    cursor: "pointer"
  },

  editButton: {
    background: "#d4af37",
    color: "#080808",
    border: "none",
    padding: "10px 18px",
    borderRadius: "10px",
    marginRight: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  techButton: {
    background: "#8b6f1d",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "10px",
    marginRight: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  invoiceButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "10px",
    marginRight: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  deleteButton: {
    background: "#991b1b",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  }
};

export default Jobs;
