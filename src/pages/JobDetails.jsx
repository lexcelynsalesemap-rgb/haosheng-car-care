
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../supabase/client";

// -----------------------------------
// TRANSLATIONS
// -----------------------------------

const jobDetailsTranslations = {
  ar: {
    "Job Details": "تفاصيل الطلب",
    "Loading...": "جارٍ التحميل...",
    "Customer Information": "معلومات العميل",
    "Name:": "الاسم:",
    "Phone:": "الهاتف:",
    "Date:": "التاريخ:",
    "Source:": "المصدر:",
    "Vehicle Information": "معلومات السيارة",
    "Model:": "الموديل:",
    "Type:": "النوع:",
    "Color:": "اللون:",
    "Plate:": "رقم اللوحة:",
    "Services": "الخدمات",
    "Price:": "السعر:",
    "Quantity:": "الكمية:",
    "Discount:": "الخصم:",
    "Final:": "الإجمالي النهائي:",
    "WTT is paid through Teyseer and is NOT included in the customer's balance.":
      "تيسير تتحمل تكلفة WTT ولا يتم تضمينها في رصيد العميل.",
    "Technicians": "الفنيون",
    "Select Technicians": "اختر الفنيين",
    "Commission": "العمولة",
    "Save Technicians": "حفظ الفنيين",
    "Technicians Updated": "تم تحديث الفنيين",
    "No technician assigned": "لم يتم تعيين فني",
    "Unknown Technician": "فني غير معروف",
    "Edit Technicians": "تعديل الفنيين",
    "Service not found": "لم يتم العثور على الخدمة",
    "Payment Summary": "ملخص الدفع",
    "Internal Services Total:": "إجمالي الخدمات الداخلي:",
    "Customer Net Amount:": "صافي المبلغ المستحق من العميل:",
    "Paid:": "المدفوع:",
    "Balance:": "الرصيد المتبقي:",
    "Status:": "الحالة:",
    "Paid": "مدفوع",
    "Partially Paid": "مدفوع جزئياً",
    "Unpaid": "غير مدفوع",
    "All services are paid through Teyseer Motors and excluded from the customer's payable balance.":
      "جميع الخدمات مدفوعة من خلال تيسير موتورز ولا تدخل ضمن المبلغ المستحق من العميل.",
    "WTT is included in the internal services total but excluded from the customer's payable balance. Other services remain customer-payable after service discounts.":
      "يتم تضمين WTT في إجمالي الخدمات الداخلي ولكن يتم استبعاده من المبلغ المستحق من العميل. وتبقى الخدمات الأخرى مستحقة على العميل بعد خصم الخصومات.",
    "Payment History": "سجل المدفوعات",
    "No payments yet.": "لا توجد مدفوعات حتى الآن.",
    "Amount:": "المبلغ:",
    "Amount": "المبلغ",
    "Method:": "طريقة الدفع:",
    "Notes:": "ملاحظات:",
    "Notes": "ملاحظات",
    "Edit": "تعديل",
    "Delete": "حذف",
    "Add Payment": "إضافة دفعة",
    "Edit Payment": "تعديل الدفعة",
    "Cash": "نقداً",
    "Visa": "فيزا",
    "Mastercard": "ماستركارد",
    "PayLater": "الدفع الآجل",
    "Bank Transfer": "تحويل بنكي",
    "Update Payment": "تحديث الدفعة",
    "Cancel": "إلغاء",
    "Invoice": "الفاتورة",
    "Edit Job": "تعديل الطلب",
    "Enter payment amount": "أدخل مبلغ الدفع",
    "Are you sure you want to delete this payment?":
      "هل أنت متأكد أنك تريد حذف هذه الدفعة؟",
    "Could not delete payment:": "تعذر حذف الدفعة:",
    "Payment deleted and job balance updated!":
      "تم حذف الدفعة وتحديث رصيد الطلب!",
    "Payment added and job balance updated!":
      "تمت إضافة الدفعة وتحديث رصيد الطلب!",
    "Payment updated and job balance updated!":
      "تم تحديث الدفعة ورصيد الطلب!",
    "Payment changed, but job balance could not be updated:":
      "تم تغيير الدفعة، ولكن تعذر تحديث رصيد الطلب:",
    "Save Payment": "حفظ الدفعة",
    "Update Technicians": "تحديث الفنيين",
    "N/A": "غير متوفر"
  },

  zh: {
    "Job Details": "工单详情",
    "Loading...": "正在加载...",
    "Customer Information": "客户信息",
    "Name:": "姓名：",
    "Phone:": "电话：",
    "Date:": "日期：",
    "Source:": "来源：",
    "Vehicle Information": "车辆信息",
    "Model:": "车型：",
    "Type:": "类型：",
    "Color:": "颜色：",
    "Plate:": "车牌号：",
    "Services": "服务项目",
    "Price:": "价格：",
    "Quantity:": "数量：",
    "Discount:": "折扣：",
    "Final:": "最终金额：",
    "WTT is paid through Teyseer and is NOT included in the customer's balance.":
      "WTT费用由Teyseer支付，不计入客户余额。",
    "Technicians": "技师",
    "Select Technicians": "选择技师",
    "Commission": "佣金",
    "Save Technicians": "保存技师",
    "Technicians Updated": "技师已更新",
    "No technician assigned": "尚未分配技师",
    "Unknown Technician": "未知技师",
    "Edit Technicians": "编辑技师",
    "Service not found": "未找到服务项目",
    "Payment Summary": "付款汇总",
    "Internal Services Total:": "内部服务总额：",
    "Customer Net Amount:": "客户应付净额：",
    "Paid:": "已付款：",
    "Balance:": "未付余额：",
    "Status:": "状态：",
    "Paid": "已付款",
    "Partially Paid": "部分付款",
    "Unpaid": "未付款",
    "All services are paid through Teyseer Motors and excluded from the customer's payable balance.":
      "所有服务均由Teyseer Motors支付，不计入客户应付余额。",
    "WTT is included in the internal services total but excluded from the customer's payable balance. Other services remain customer-payable after service discounts.":
      "WTT计入内部服务总额，但不计入客户应付余额。其他服务扣除折扣后仍由客户支付。",
    "Payment History": "付款记录",
    "No payments yet.": "暂无付款记录。",
    "Amount:": "金额：",
    "Amount": "金额",
    "Method:": "付款方式：",
    "Notes:": "备注：",
    "Notes": "备注",
    "Edit": "编辑",
    "Delete": "删除",
    "Add Payment": "添加付款",
    "Edit Payment": "编辑付款",
    "Cash": "现金",
    "Visa": "Visa",
    "Mastercard": "Mastercard",
    "PayLater": "延期付款",
    "Bank Transfer": "银行转账",
    "Update Payment": "更新付款",
    "Cancel": "取消",
    "Invoice": "发票",
    "Edit Job": "编辑工单",
    "Enter payment amount": "请输入付款金额",
    "Are you sure you want to delete this payment?":
      "确定要删除这笔付款吗？",
    "Could not delete payment:": "无法删除付款：",
    "Payment deleted and job balance updated!":
      "付款已删除，工单余额已更新！",
    "Payment added and job balance updated!":
      "付款已添加，工单余额已更新！",
    "Payment updated and job balance updated!":
      "付款已更新，工单余额已更新！",
    "Payment changed, but job balance could not be updated:":
      "付款已更改，但无法更新工单余额：",
    "Save Payment": "保存付款",
    "Update Technicians": "更新技师",
    "N/A": "不适用"
  }
};

function translateJobDetails(text, language) {
  if (language === "ar" || language === "zh") {
    return jobDetailsTranslations[language][text] || text;
  }

  return text;
}

// -----------------------------------
// JOB DETAILS COMPONENT
// -----------------------------------

function JobDetails() {
  const { id } = useParams();
  const { i18n } = useTranslation();

  const language =
    i18n.resolvedLanguage || i18n.language || "en";

  const tr = (text) =>
    translateJobDetails(text, language);

  const [job, setJob] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [serviceTechnicians, setServiceTechnicians] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [selectedTechs, setSelectedTechs] = useState([]);
  const [payments, setPayments] = useState([]);

  // PAYMENT
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [editingPayment, setEditingPayment] = useState(null);

  // -----------------------------------
  // TEYSEER CHECK
  // -----------------------------------

  function isTeyseerSource(sourceName) {
    return (
      sourceName === "Teyseer Motors" ||
      sourceName === "Teyseer Motors - Bahaa" ||
      sourceName === "Teyseer Motors - Salah" ||
      sourceName === "Teyseer Motors - Abdou"
    );
  }

  function isWttService(serviceName) {
    return serviceName
      ?.toLowerCase()
      .includes("wtt");
  }

  // -----------------------------------
  // LOAD JOB
  // -----------------------------------

  async function loadJob() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", Number(id))
      .single();

    if (error) {
      console.error("LOAD JOB ERROR:", error);
      return;
    }

    setJob(data);
  }

  // -----------------------------------
  // LOAD TECHNICIANS
  // -----------------------------------

  async function loadTechnicians() {
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("active", true);

    if (error) {
      console.error("LOAD TECHNICIANS ERROR:", error);
      return;
    }

    setTechnicians(data || []);
  }

  // -----------------------------------
  // LOAD TECHNICIANS ASSIGNED TO SERVICES
  // -----------------------------------

  async function loadServiceTechnicians() {
    const { data, error } = await supabase
      .from("service_technicians")
      .select(`
        id,
        commission,
        technician_id,
        service_id,

        technicians(
          id,
          name
        ),

        job_services(
          id,
          service_name,
          job_id
        )
      `)
      .eq("job_services.job_id", Number(id));

    if (error) {
      console.error(
        "LOAD SERVICE TECHNICIANS ERROR:",
        error
      );
      return;
    }

    setServiceTechnicians(data || []);
  }

  // -----------------------------------
  // LOAD PAYMENTS
  // -----------------------------------

  async function loadPayments() {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("job_id", Number(id))
      .order("payment_date", {
        ascending: false
      });

    if (error) {
      console.error("LOAD PAYMENTS ERROR:", error);
      return;
    }

    setPayments(data || []);
  }

  // -----------------------------------
  // INITIAL LOAD
  // -----------------------------------

  useEffect(() => {
    loadJob();
    loadTechnicians();
    loadServiceTechnicians();
    loadPayments();
  }, [id]);

  // -----------------------------------
  // CALCULATE CUSTOMER TOTAL
  // -----------------------------------

  function calculateCustomerTotal(currentJob) {
    if (!currentJob) {
      return 0;
    }

    const services = Array.isArray(currentJob.services)
      ? currentJob.services
      : [];

    const serviceDetails =
      currentJob.serviceDetails &&
      typeof currentJob.serviceDetails === "object"
        ? currentJob.serviceDetails
        : {};

    const source = String(currentJob.source || "").trim();

    // Match Invoice.jsx:
    // All services for the exact "Teyseer Motors" source are paid through Teyseer.
    // For Salah/Bahaa sources, WTT is paid through Teyseer, while other services
    // remain customer-payable after service-level discounts.
    if (source === "Teyseer Motors") {
      return 0;
    }

    const total = services.reduce(
      (sum, serviceName) => {
        if (
          isTeyseerSource(source) &&
          isWttService(serviceName)
        ) {
          return sum;
        }

        const details =
          serviceDetails[serviceName] || {};

        const price =
          Number(details.price || 0);

        const quantity =
          Number(details.quantity || 1);

        const discount =
          Number(details.discount || 0);

        const serviceTotal = Math.max(
          price * quantity - discount,
          0
        );

        return sum + serviceTotal;
      },
      0
    );

    return Math.max(total, 0);
  }

  // -----------------------------------
  // CALCULATE TOTAL PAID
  // -----------------------------------

  function calculateTotalPaid(paymentList) {
    return (paymentList || []).reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );
  }

  // -----------------------------------
  // UPDATE JOB PAYMENT SUMMARY
  // -----------------------------------

  async function updateJobPaymentSummary() {
    const { data: currentJob, error: jobError } =
      await supabase
        .from("jobs")
        .select(`
          price,
          discount,
          services,
          serviceDetails,
          source
        `)
        .eq("id", Number(id))
        .single();

    if (jobError) {
      console.error(
        "LOAD JOB FOR PAYMENT SUMMARY ERROR:",
        jobError
      );
      return;
    }

    const { data: paymentData, error: paymentError } =
      await supabase
        .from("payments")
        .select("amount")
        .eq("job_id", Number(id));

    if (paymentError) {
      console.error(
        "LOAD PAYMENTS FOR PAYMENT SUMMARY ERROR:",
        paymentError
      );
      return;
    }

    const customerTotal =
      calculateCustomerTotal(currentJob);

    const totalPaid =
      calculateTotalPaid(paymentData);

    const balance = Math.max(
      customerTotal - totalPaid,
      0
    );

    console.log(
      "========== PAYMENT SUMMARY =========="
    );

    console.log("JOB ID:", id);
    console.log("CUSTOMER TOTAL:", customerTotal);
    console.log("TOTAL PAID:", totalPaid);
    console.log("BALANCE:", balance);

    console.log(
      "======================================"
    );

    const { error: updateError } =
      await supabase
        .from("jobs")
        .update({
          deposit: totalPaid,
          balance: balance
        })
        .eq("id", Number(id));

    if (updateError) {
      console.error(
        "UPDATE JOB BALANCE ERROR:",
        updateError
      );

      alert(
        tr("Payment changed, but job balance could not be updated:") +
        "\n\n" +
        updateError.message
      );

      return;
    }

    setJob((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        deposit: totalPaid,
        balance: balance
      };
    });
  }

  // -----------------------------------
  // START EDIT TECHNICIANS
  // -----------------------------------

  function startEditTechnicians(service) {
    const current =
      serviceTechnicians
        .filter(
          (t) =>
            t.job_services?.service_name === service
        )
        .map((t) => ({
          id:
            t.technicians?.id ||
            t.technician_id,
          commission:
            Number(t.commission || 0)
        }));

    setSelectedTechs(current);
    setEditingService(service);
  }

  // -----------------------------------
  // SAVE TECHNICIANS
  // -----------------------------------

  async function saveTechnicians(service) {
    const { data: jobService, error } =
      await supabase
        .from("job_services")
        .select("id")
        .eq("job_id", Number(id))
        .eq("service_name", service)
        .single();

    if (error || !jobService) {
      console.error(
        "SERVICE NOT FOUND:",
        error
      );

      alert(tr("Service not found"));
      return;
    }

    const { error: deleteError } =
      await supabase
        .from("service_technicians")
        .delete()
        .eq("service_id", jobService.id);

    if (deleteError) {
      console.error(
        "DELETE TECHNICIANS ERROR:",
        deleteError
      );

      alert(deleteError.message);
      return;
    }

    const rows = selectedTechs.map((tech) => ({
      service_id: jobService.id,
      technician_id: tech.id,
      commission: Number(
        tech.commission || 0
      )
    }));

    if (rows.length > 0) {
      const { error: insertError } =
        await supabase
          .from("service_technicians")
          .insert(rows);

      if (insertError) {
        console.error(
          "INSERT TECHNICIANS ERROR:",
          insertError
        );

        alert(insertError.message);
        return;
      }
    }

    await loadServiceTechnicians();

    setEditingService(null);
    setSelectedTechs([]);

    alert(tr("Technicians Updated"));
  }

  // -----------------------------------
  // ADD PAYMENT
  // -----------------------------------

  async function savePayment() {
    if (!amount || Number(amount) <= 0) {
      alert(tr("Enter payment amount"));
      return;
    }

    const { error } = await supabase
      .from("payments")
      .insert([
        {
          job_id: Number(id),
          amount: Number(amount),
          payment_method: method,
          payment_date:
            new Date().toISOString(),
          notes: notes.trim() || null
        }
      ]);

    if (error) {
      console.error(
        "SAVE PAYMENT ERROR:",
        error
      );

      alert(error.message);
      return;
    }

    clearPaymentForm();

    await loadPayments();

    await updateJobPaymentSummary();

    alert(
      tr("Payment added and job balance updated!")
    );
  }

  // -----------------------------------
  // CLEAR PAYMENT FORM
  // -----------------------------------

  function clearPaymentForm() {
    setAmount("");
    setMethod("Cash");
    setNotes("");
    setEditingPayment(null);
  }

  // -----------------------------------
  // DELETE PAYMENT
  // -----------------------------------

  async function deletePayment(paymentId) {
    const confirmed = window.confirm(
      tr("Are you sure you want to delete this payment?")
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId);

    if (error) {
      console.error(
        "DELETE PAYMENT ERROR:",
        error
      );

      alert(
        tr("Could not delete payment:") +
        "\n\n" +
        error.message
      );

      return;
    }

    await loadPayments();

    await updateJobPaymentSummary();

    alert(
      tr("Payment deleted and job balance updated!")
    );
  }

  // -----------------------------------
  // START EDIT PAYMENT
  // -----------------------------------

  function startEditPayment(payment) {
    setEditingPayment(payment);

    setAmount(
      String(payment.amount || "")
    );

    setMethod(
      payment.payment_method || "Cash"
    );

    setNotes(
      payment.notes || ""
    );
  }

  // -----------------------------------
  // UPDATE PAYMENT
  // -----------------------------------

  async function updatePayment() {
    if (!editingPayment) return;

    if (!amount || Number(amount) <= 0) {
      alert(tr("Enter payment amount"));
      return;
    }

    const { error } = await supabase
      .from("payments")
      .update({
        amount: Number(amount),
        payment_method: method,
        notes: notes.trim() || null
      })
      .eq("id", editingPayment.id);

    if (error) {
      console.error(
        "UPDATE PAYMENT ERROR:",
        error
      );

      alert(error.message);
      return;
    }

    clearPaymentForm();

    await loadPayments();

    await updateJobPaymentSummary();

    alert(
      tr("Payment updated and job balance updated!")
    );
  }

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (!job) {
    return (
      <h1 style={styles.loading}>
        {tr("Loading...")}
      </h1>
    );
  }

  // -----------------------------------
  // TOTALS
  // -----------------------------------

  const internalTotal =
    (job.services || []).reduce(
      (sum, serviceName) => {
        const details =
          job.serviceDetails?.[serviceName] || {};

        const price =
          Number(details.price || 0);

        const quantity =
          Number(details.quantity || 1);

        const discount =
          Number(details.discount || 0);

        return (
          sum +
          Math.max(
            price * quantity - discount,
            0
          )
        );
      },
      0
    );

  const customerNetAmount =
    calculateCustomerTotal(job);

  const totalPaid =
    calculateTotalPaid(payments);

  const balance = Math.max(
    customerNetAmount - totalPaid,
    0
  );

  // -----------------------------------
  // PAYMENT STATUS
  // -----------------------------------

  let paymentStatus = "Unpaid";

  if (balance <= 0 && (totalPaid > 0 || customerNetAmount <= 0)) {
    paymentStatus = "Paid";
  } else if (totalPaid > 0) {
    paymentStatus = "Partially Paid";
  }

  // -----------------------------------
  // PAGE
  // -----------------------------------

  return (
    <div style={styles.page}>

      <h1>
        {tr("Job Details")}
      </h1>

      <div style={styles.card}>

        {/* CUSTOMER */}

        <h2>
          {tr("Customer Information")}
        </h2>

        <p>
          <strong>{tr("Name:")}</strong>{" "}
          {job.customer}
        </p>

        <p>
          <strong>{tr("Phone:")}</strong>{" "}
          {job.phone}
        </p>

        <p>
          <strong>{tr("Date:")}</strong>{" "}
          {job.date}
        </p>

        <p>
          <strong>{tr("Source:")}</strong>{" "}
          {job.source}
        </p>

        {/* VEHICLE */}

        <h2>
          {tr("Vehicle Information")}
        </h2>

        <p>
          <strong>{tr("Model:")}</strong>{" "}
          {job.carModel}
        </p>

        <p>
          <strong>{tr("Type:")}</strong>{" "}
          {job.carType}
        </p>

        <p>
          <strong>{tr("Color:")}</strong>{" "}
          {job.color}
        </p>

        <p>
          <strong>{tr("Plate:")}</strong>{" "}
          {job.plate}
        </p>

        {/* SERVICES */}

        <h2>
          {tr("Services")}
        </h2>

        {(job.services || []).map(
          (service) => {

            const serviceTechs =
              serviceTechnicians.filter(
                (item) =>
                  item.job_services
                    ?.service_name === service
              );

            const details =
              job.serviceDetails?.[service] || {};

            const price =
              Number(details.price || 0);

            const quantity =
              Number(details.quantity || 1);

            const discount =
              Number(details.discount || 0);

            const finalServicePrice =
              Math.max(
                price * quantity - discount,
                0
              );

            const isTeyseerWtt =
              isTeyseerSource(job.source) &&
              isWttService(service);

            return (
              <div
                key={service}
                style={styles.service}
              >

                <h3>
                  {service}
                </h3>

                <p>
                  {tr("Price:")} QAR{" "}
                  {price.toFixed(2)}
                </p>

                <p>
                  {tr("Quantity:")}{" "}
                  {quantity}
                </p>

                <p>
                  {tr("Discount:")} QAR{" "}
                  {discount.toFixed(2)}
                </p>

                <p>
                  {tr("Final:")} QAR{" "}
                  {finalServicePrice.toFixed(2)}
                </p>

                {isTeyseerWtt && (
                  <div style={styles.teyseerNotice}>
                    {tr(
                      "WTT is paid through Teyseer and is NOT included in the customer's balance."
                    )}
                  </div>
                )}

                <h4>
                  {tr("Technicians")}
                </h4>

                {editingService === service ? (

                  <div>

                    <h4>
                      {tr("Select Technicians")}
                    </h4>

                    {technicians.map(
                      (person) => {

                        const selected =
                          selectedTechs.find(
                            (t) =>
                              t.id === person.id
                          );

                        return (
                          <div
                            key={person.id}
                            style={styles.techRow}
                          >

                            <label>

                              <input
                                type="checkbox"
                                checked={!!selected}
                                onChange={(e) => {

                                  if (e.target.checked) {
                                    setSelectedTechs([
                                      ...selectedTechs,
                                      {
                                        id: person.id,
                                        commission: 0
                                      }
                                    ]);
                                  } else {
                                    setSelectedTechs(
                                      selectedTechs.filter(
                                        (t) =>
                                          t.id !== person.id
                                      )
                                    );
                                  }

                                }}
                              />

                              {" "}
                              {person.name}

                            </label>

                            {selected && (

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder={tr("Commission")}
                                value={selected.commission}
                                onChange={(e) => {

                                  setSelectedTechs(
                                    selectedTechs.map(
                                      (t) =>
                                        t.id === person.id
                                          ? {
                                              ...t,
                                              commission:
                                                Number(e.target.value)
                                            }
                                          : t
                                    )
                                  );

                                }}
                                style={styles.commissionInput}
                              />

                            )}

                          </div>
                        );

                      }
                    )}

                    <br />

                    <button
                      onClick={() =>
                        saveTechnicians(service)
                      }
                      style={styles.button}
                    >
                      {tr("Save Technicians")}
                    </button>

                  </div>

                ) : (

                  <div>

                    {serviceTechs.length > 0 ? (

                      serviceTechs.map(
                        (tech) => (

                          <div
                            key={tech.id}
                            style={styles.technicianBox}
                          >

                            <p>
                              👷{" "}
                              {tech.technicians?.name ||
                                tr("Unknown Technician")}
                            </p>

                            <p>
                              {tr("Commission")}: QAR{" "}
                              {Number(
                                tech.commission || 0
                              ).toFixed(2)}
                            </p>

                          </div>

                        )
                      )

                    ) : (

                      <p>
                        {tr("No technician assigned")}
                      </p>

                    )}

                    <button
                      onClick={() =>
                        startEditTechnicians(service)
                      }
                      style={styles.editButton}
                    >
                      ✏️ {tr("Edit Technicians")}
                    </button>

                  </div>

                )}

              </div>
            );
          }
        )}

        {/* PAYMENT SUMMARY */}

        <h2>
          {tr("Payment Summary")}
        </h2>

        <div style={styles.summaryBox}>

          <p>
            <strong>
              {tr("Internal Services Total:")}
            </strong>
            {" "}
            QAR{" "}
            {internalTotal.toFixed(2)}
          </p>

          <p style={styles.customerTotal}>
            <strong>
              {tr("Customer Net Amount:")}
            </strong>
            {" "}
            QAR{" "}
            {customerNetAmount.toFixed(2)}
          </p>

          <p style={styles.paid}>
            <strong>
              {tr("Paid:")}
            </strong>
            {" "}
            QAR{" "}
            {totalPaid.toFixed(2)}
          </p>

          <h2 style={styles.balance}>
            {tr("Balance:")}
            {" "}
            QAR{" "}
            {balance.toFixed(2)}
          </h2>

          <p>
            <strong>
              {tr("Status:")}
            </strong>
            {" "}

            {paymentStatus === "Paid"
              ? `🟢 ${tr("Paid")}`
              : paymentStatus === "Partially Paid"
              ? `🟡 ${tr("Partially Paid")}`
              : `🔴 ${tr("Unpaid")}`}

          </p>

          {job.source === "Teyseer Motors" ? (

            <div style={styles.teyseerNotice}>
              {tr(
                "All services are paid through Teyseer Motors and excluded from the customer's payable balance."
              )}
            </div>

          ) : (

            isTeyseerSource(job.source) && (

              <div style={styles.teyseerNotice}>
                {tr(
                  "WTT is included in the internal services total but excluded from the customer's payable balance. Other services remain customer-payable after service discounts."
                )}
              </div>

            )

          )}

        </div>

        <hr />

        {/* PAYMENT HISTORY */}

        <h2>
          {tr("Payment History")}
        </h2>

        {payments.length === 0 ? (

          <p>
            {tr("No payments yet.")}
          </p>

        ) : (

          payments.map(
            (payment) => (

              <div
                key={payment.id}
                style={styles.paymentBox}
              >

                <p>
                  <strong>
                    {tr("Date:")}
                  </strong>
                  {" "}
                  {payment.payment_date
                    ? new Date(
                        payment.payment_date
                      ).toLocaleDateString()
                    : tr("N/A")}
                </p>

                <p>
                  <strong>
                    {tr("Amount:")}
                  </strong>
                  {" "}
                  QAR{" "}
                  {Number(
                    payment.amount || 0
                  ).toFixed(2)}
                </p>

                <p>
                  <strong>
                    {tr("Method:")}
                  </strong>
                  {" "}
                  {payment.payment_method === "Cash"
                    ? tr("Cash")
                    : payment.payment_method === "Visa"
                    ? tr("Visa")
                    : payment.payment_method === "Mastercard"
                    ? tr("Mastercard")
                    : payment.payment_method === "PayLater"
                    ? tr("PayLater")
                    : payment.payment_method === "Bank Transfer"
                    ? tr("Bank Transfer")
                    : payment.payment_method}
                </p>

                {payment.notes && (

                  <p>
                    <strong>
                      {tr("Notes:")}
                    </strong>
                    {" "}
                    {payment.notes}
                  </p>

                )}

                <button
                  style={styles.editButton}
                  onClick={() =>
                    startEditPayment(payment)
                  }
                >
                  ✏️ {tr("Edit")}
                </button>

                <button
                  style={styles.deleteButton}
                  onClick={() =>
                    deletePayment(payment.id)
                  }
                >
                  🗑 {tr("Delete")}
                </button>

              </div>

            )
          )

        )}

        <hr />

        {/* ADD / EDIT PAYMENT */}

        <h2>
          {editingPayment
            ? tr("Edit Payment")
            : tr("Add Payment")}
        </h2>

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder={tr("Amount")}
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
          style={styles.input}
        />

        <select
          value={method}
          onChange={(e) =>
            setMethod(e.target.value)
          }
          style={styles.input}
        >

          <option value="Cash">
            {tr("Cash")}
          </option>

          <option value="Visa">
            {tr("Visa")}
          </option>

          <option value="Mastercard">
            {tr("Mastercard")}
          </option>

          <option value="PayLater">
            {tr("PayLater")}
          </option>

          <option value="Bank Transfer">
            {tr("Bank Transfer")}
          </option>

        </select>

        <textarea
          placeholder={tr("Notes")}
          value={notes}
          onChange={(e) =>
            setNotes(e.target.value)
          }
          style={styles.textarea}
        />

        <button
          style={styles.button}
          onClick={
            editingPayment
              ? updatePayment
              : savePayment
          }
        >
          {editingPayment
            ? tr("Update Payment")
            : tr("Add Payment")}
        </button>

        {editingPayment && (

          <button
            style={styles.cancelButton}
            onClick={clearPaymentForm}
          >
            {tr("Cancel")}
          </button>

        )}

        <br />
        <br />

        {/* INVOICE */}

        <Link to={`/invoice/${job.id}`}>
          <button style={styles.invoiceButton}>
            🧾 {tr("Invoice")}
          </button>
        </Link>

        {" "}

        {/* EDIT JOB */}

        <Link to={`/edit-job/${job.id}`}>
          <button style={styles.editJobButton}>
            ✏️ {tr("Edit Job")}
          </button>
        </Link>

      </div>
    </div>
  );
}

// -----------------------------------
// STYLES
// -----------------------------------

const styles = {
  page: {
    padding: "30px",
    background: "var(--bg)",
    minHeight: "100vh",
    color: "#1e293b"
  },

  card: {
    background: "var(--card, #ffffff)",
    padding: "30px",
    borderRadius: "18px",
    maxWidth: "700px",
    boxShadow:
      "0 8px 25px rgba(0,0,0,0.08)",
    border:
      "1px solid #e2e8f0"
  },

  service: {
    border:
      "1px solid #e2e8f0",
    padding: "18px",
    borderRadius: "12px",
    marginBottom: "15px",
    background: "#f8fafc"
  },

  summaryBox: {
    border:
      "1px solid #e2e8f0",
    padding: "18px",
    borderRadius: "12px",
    background: "#f8fafc"
  },

  paymentBox: {
    border:
      "1px solid #e2e8f0",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "12px",
    background: "#f8fafc"
  },

  technicianBox: {
    border:
      "1px solid #e2e8f0",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "8px",
    background: "#ffffff"
  },

  techRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px"
  },

  commissionInput: {
    width: "140px",
    padding: "8px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "7px"
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    marginBottom: "10px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "15px"
  },

  textarea: {
    width: "100%",
    minHeight: "90px",
    boxSizing: "border-box",
    padding: "12px",
    marginBottom: "10px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "15px",
    resize: "vertical"
  },

  button: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    marginTop: "10px",
    fontSize: "14px",
    fontWeight: "700"
  },

  editButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "9px 16px",
    borderRadius: "9px",
    cursor: "pointer",
    marginRight: "10px",
    fontWeight: "600"
  },

  deleteButton: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "9px 16px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "600"
  },

  cancelButton: {
    background: "#64748b",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    marginLeft: "10px",
    fontWeight: "600"
  },

  invoiceButton: {
    background: "#7c3aed",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "700"
  },

  editJobButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "700"
  },

  balance: {
    color: "#dc2626"
  },

  paid: {
    color: "#16a34a"
  },

  customerTotal: {
    color: "#2563eb",
    fontSize: "18px"
  },

  teyseerNotice: {
    background: "#241f10",
    color: "#d4af37",
    border:
      "1px solid #d4af37",
    padding: "10px",
    borderRadius: "8px",
    marginTop: "10px",
    fontSize: "13px",
    fontWeight: "600"
  },

  loading: {
    padding: "30px"
  }
};

export default JobDetails;
