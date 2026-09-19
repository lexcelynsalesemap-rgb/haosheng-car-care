import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabase/client";

function JobDetails() {
  const { id } = useParams();

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

    const source = currentJob.source || "";

    const total = services.reduce(
      (sum, serviceName) => {
        // WTT is paid by Teyseer
        // and is NOT charged to customer.
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

    // Calculate customer payable amount
    const customerTotal =
      calculateCustomerTotal(currentJob);

    // Calculate all payments
    const totalPaid =
      calculateTotalPaid(paymentData);

    // Customer balance
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

    // Update database
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
        "Payment changed, but job balance could not be updated:\n\n" +
          updateError.message
      );

      return;
    }

    // Update React state
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

      alert("Service not found");
      return;
    }

    // Delete old assignments
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

    // Create new assignments
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

    alert("Technicians Updated");
  }

  // -----------------------------------
  // ADD PAYMENT
  // -----------------------------------

  async function savePayment() {
    if (!amount || Number(amount) <= 0) {
      alert("Enter payment amount");
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
      "Payment added and job balance updated!"
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
      "Are you sure you want to delete this payment?"
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
        "Could not delete payment:\n\n" +
          error.message
      );

      return;
    }

    await loadPayments();

    await updateJobPaymentSummary();

    alert(
      "Payment deleted and job balance updated!"
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
      alert("Enter payment amount");
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
      "Payment updated and job balance updated!"
    );
  }

  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (!job) {
    return (
      <h1 style={styles.loading}>
        Loading...
      </h1>
    );
  }

  // -----------------------------------
  // TOTALS
  // -----------------------------------

  // Internal total includes WTT.
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

  // Customer total excludes WTT for Teyseer.
  const customerNetAmount =
    calculateCustomerTotal(job);

  // Total payments.
  const totalPaid =
    calculateTotalPaid(payments);

  // Correct customer balance.
  const balance = Math.max(
    customerNetAmount - totalPaid,
    0
  );

  // -----------------------------------
  // PAYMENT STATUS
  // -----------------------------------

  let paymentStatus = "Unpaid";

  if (balance <= 0 && totalPaid > 0) {
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
        Job Details
      </h1>

      <div style={styles.card}>

        {/* -------------------------------- */}
        {/* CUSTOMER */}
        {/* -------------------------------- */}

        <h2>
          Customer Information
        </h2>

        <p>
          <strong>Name:</strong>{" "}
          {job.customer}
        </p>

        <p>
          <strong>Phone:</strong>{" "}
          {job.phone}
        </p>

        <p>
          <strong>Date:</strong>{" "}
          {job.date}
        </p>

        <p>
          <strong>Source:</strong>{" "}
          {job.source}
        </p>

        {/* -------------------------------- */}
        {/* VEHICLE */}
        {/* -------------------------------- */}

        <h2>
          Vehicle Information
        </h2>

        <p>
          <strong>Model:</strong>{" "}
          {job.carModel}
        </p>

        <p>
          <strong>Type:</strong>{" "}
          {job.carType}
        </p>

        <p>
          <strong>Color:</strong>{" "}
          {job.color}
        </p>

        <p>
          <strong>Plate:</strong>{" "}
          {job.plate}
        </p>

        {/* -------------------------------- */}
        {/* SERVICES */}
        {/* -------------------------------- */}

        <h2>
          Services
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
                  Price: QAR{" "}
                  {price.toFixed(2)}
                </p>

                <p>
                  Quantity:{" "}
                  {quantity}
                </p>

                <p>
                  Discount: QAR{" "}
                  {discount.toFixed(2)}
                </p>

                <p>
                  Final: QAR{" "}
                  {finalServicePrice.toFixed(2)}
                </p>

                {isTeyseerWtt && (
                  <div
                    style={
                      styles.teyseerNotice
                    }
                  >
                    WTT is paid through
                    Teyseer and is NOT included
                    in the customer's balance.
                  </div>
                )}

                <h4>
                  Technicians
                </h4>

                {editingService === service ? (

                  <div>

                    <h4>
                      Select Technicians
                    </h4>

                    {technicians.map(
                      (person) => {

                        const selected =
                          selectedTechs.find(
                            (t) =>
                              t.id ===
                              person.id
                          );

                        return (
                          <div
                            key={person.id}
                            style={
                              styles.techRow
                            }
                          >

                            <label>

                              <input
                                type="checkbox"
                                checked={
                                  !!selected
                                }
                                onChange={(e) => {

                                  if (
                                    e.target
                                      .checked
                                  ) {

                                    setSelectedTechs(
                                      [
                                        ...selectedTechs,
                                        {
                                          id: person.id,
                                          commission: 0
                                        }
                                      ]
                                    );

                                  } else {

                                    setSelectedTechs(
                                      selectedTechs.filter(
                                        (t) =>
                                          t.id !==
                                          person.id
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
                                placeholder="Commission"
                                value={
                                  selected.commission
                                }
                                onChange={(e) => {

                                  setSelectedTechs(
                                    selectedTechs.map(
                                      (t) =>
                                        t.id ===
                                        person.id
                                          ? {
                                              ...t,
                                              commission:
                                                Number(
                                                  e.target
                                                    .value
                                                )
                                            }
                                          : t
                                    )
                                  );

                                }}
                                style={
                                  styles.commissionInput
                                }
                              />

                            )}

                          </div>
                        );

                      }
                    )}

                    <br />

                    <button
                      onClick={() =>
                        saveTechnicians(
                          service
                        )
                      }
                      style={
                        styles.button
                      }
                    >
                      Save Technicians
                    </button>

                  </div>

                ) : (

                  <div>

                    {serviceTechs.length >
                    0 ? (

                      serviceTechs.map(
                        (tech) => (

                          <div
                            key={tech.id}
                            style={
                              styles.technicianBox
                            }
                          >

                            <p>
                              👷{" "}
                              {tech.technicians
                                ?.name ||
                                "Unknown Technician"}
                            </p>

                            <p>
                              Commission:
                              {" "}
                              QAR{" "}
                              {Number(
                                tech.commission ||
                                  0
                              ).toFixed(2)}
                            </p>

                          </div>

                        )
                      )

                    ) : (

                      <p>
                        No technician assigned
                      </p>

                    )}

                    <button
                      onClick={() =>
                        startEditTechnicians(
                          service
                        )
                      }
                      style={
                        styles.editButton
                      }
                    >
                      ✏️ Edit Technicians
                    </button>

                  </div>

                )}

              </div>
            );
          }
        )}

        {/* -------------------------------- */}
        {/* PAYMENT SUMMARY */}
        {/* -------------------------------- */}

        <h2>
          Payment Summary
        </h2>

        <div
          style={
            styles.summaryBox
          }
        >

          <p>
            <strong>
              Internal Services Total:
            </strong>
            {" "}
            QAR{" "}
            {internalTotal.toFixed(2)}
          </p>

          <p
            style={
              styles.customerTotal
            }
          >
            <strong>
              Customer Net Amount:
            </strong>
            {" "}
            QAR{" "}
            {customerNetAmount.toFixed(2)}
          </p>

          <p
            style={
              styles.paid
            }
          >
            <strong>
              Paid:
            </strong>
            {" "}
            QAR{" "}
            {totalPaid.toFixed(2)}
          </p>

          <h2
            style={
              styles.balance
            }
          >
            Balance:
            {" "}
            QAR{" "}
            {balance.toFixed(2)}
          </h2>

          <p>
            <strong>
              Status:
            </strong>
            {" "}

            {paymentStatus === "Paid"
              ? "🟢 Paid"
              : paymentStatus ===
                "Partially Paid"
              ? "🟡 Partially Paid"
              : "🔴 Unpaid"}

          </p>

          {isTeyseerSource(
            job.source
          ) && (

            <div
              style={
                styles.teyseerNotice
              }
            >
              WTT is included in the
              internal services total but
              excluded from the customer's
              payable balance.
            </div>

          )}

        </div>

        <hr />

        {/* -------------------------------- */}
        {/* PAYMENT HISTORY */}
        {/* -------------------------------- */}

        <h2>
          Payment History
        </h2>

        {payments.length === 0 ? (

          <p>
            No payments yet.
          </p>

        ) : (

          payments.map(
            (payment) => (

              <div
                key={payment.id}
                style={
                  styles.paymentBox
                }
              >

                <p>
                  <strong>
                    Date:
                  </strong>
                  {" "}
                  {payment.payment_date
                    ? new Date(
                        payment.payment_date
                      ).toLocaleDateString()
                    : "N/A"}
                </p>

                <p>
                  <strong>
                    Amount:
                  </strong>
                  {" "}
                  QAR{" "}
                  {Number(
                    payment.amount || 0
                  ).toFixed(2)}
                </p>

                <p>
                  <strong>
                    Method:
                  </strong>
                  {" "}
                  {payment.payment_method}
                </p>

                {payment.notes && (

                  <p>
                    <strong>
                      Notes:
                    </strong>
                    {" "}
                    {payment.notes}
                  </p>

                )}

                <button
                  style={
                    styles.editButton
                  }
                  onClick={() =>
                    startEditPayment(
                      payment
                    )
                  }
                >
                  ✏️ Edit
                </button>

                <button
                  style={
                    styles.deleteButton
                  }
                  onClick={() =>
                    deletePayment(
                      payment.id
                    )
                  }
                >
                  🗑 Delete
                </button>

              </div>

            )
          )

        )}

        <hr />

        {/* -------------------------------- */}
        {/* ADD / EDIT PAYMENT */}
        {/* -------------------------------- */}

        <h2>
          {editingPayment
            ? "Edit Payment"
            : "Add Payment"}
        </h2>

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount"
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
            Cash
          </option>

          <option value="Visa">
            Visa
          </option>

          <option value="Mastercard">
            Mastercard
          </option>

          <option value="PayLater">
            PayLater
          </option>

          <option value="Bank Transfer">
            Bank Transfer
          </option>

        </select>

        <textarea
          placeholder="Notes"
          value={notes}
          onChange={(e) =>
            setNotes(e.target.value)
          }
          style={
            styles.textarea
          }
        />

        <button
          style={
            styles.button
          }
          onClick={
            editingPayment
              ? updatePayment
              : savePayment
          }
        >

          {editingPayment
            ? "Update Payment"
            : "Add Payment"}

        </button>

        {editingPayment && (

          <button
            style={
              styles.cancelButton
            }
            onClick={
              clearPaymentForm
            }
          >
            Cancel
          </button>

        )}

        <br />
        <br />

        {/* -------------------------------- */}
        {/* INVOICE */}
        {/* -------------------------------- */}

        <Link
          to={`/invoice/${job.id}`}
        >
          <button
            style={
              styles.invoiceButton
            }
          >
            🧾 Invoice
          </button>
        </Link>

        {" "}

        {/* -------------------------------- */}
        {/* EDIT JOB */}
        {/* -------------------------------- */}

        <Link
          to={`/edit-job/${job.id}`}
        >
          <button
            style={
              styles.editJobButton
            }
          >
            ✏️ Edit Job
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