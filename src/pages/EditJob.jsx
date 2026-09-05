import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { useParams, useNavigate } from "react-router-dom";

function EditJob() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // JOB
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carType, setCarType] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");

  // SERVICES
  const [services, setServices] = useState([]);
  const [serviceDetails, setServiceDetails] = useState({});
  const [serviceList, setServiceList] = useState([]);

  // SOURCE
  const [source, setSource] = useState("");
  const [otherSource, setOtherSource] = useState("");

  // PAYMENT
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Visa");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentNotes, setPaymentNotes] = useState("");
  const [payments, setPayments] = useState([]);

useEffect(() => {
  loadJob();
  loadServices();
  loadPayments();
}, [id]);

  // -----------------------------------
  // LOAD SERVICES
  // -----------------------------------

  async function loadServices() {
    const { data, error } = await supabase
      .from("services")
      .select("*");

    if (error) {
      console.error("LOAD SERVICES ERROR:", error);
      return;
    }

    setServiceList(data || []);
  }

  // -----------------------------------
  // LOAD JOB
  // -----------------------------------

  async function loadJob() {
    setLoading(true);

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("LOAD JOB ERROR:", error);
      alert(error.message);
      setLoading(false);
      return;
    }

    console.log("EDIT JOB:", data);

    setCustomer(data.customer || "");
    setPhone(data.phone || "");
    setCarModel(data.carModel || "");
    setCarType(data.carType || "");
    setColor(data.color || "");
    setPlate(data.plate || "");

    // -----------------------------------
    // SOURCE
    // -----------------------------------

    const existingSource = String(data.source || "").trim();

    const standardSources = [
      "Teyseer Motors",
      "Teyseer Motors - Bahaa",
      "Teyseer Motors - Salah",
      "Bahaa",
      "Salah",
      "Walk-in"
    ];

    const matchedSource = standardSources.find(
      (item) =>
        item.toLowerCase() === existingSource.toLowerCase()
    );

    if (matchedSource) {
      setSource(matchedSource);
      setOtherSource("");
    } else if (existingSource) {
      setSource("Other");
      setOtherSource(existingSource);
    } else {
      setSource("");
      setOtherSource("");
    }

    // -----------------------------------
    // SERVICES
    // -----------------------------------

    const existingServices = Array.isArray(data.services)
      ? data.services
      : [];

    const normalizedServices = existingServices
      .map((service) => {
        if (typeof service === "string") {
          return service;
        }

        return (
          service?.name ||
          service?.service_name ||
          service?.title ||
          ""
        );
      })
      .filter(Boolean);

    setServices(normalizedServices);

    if (
      data.serviceDetails &&
      typeof data.serviceDetails === "object"
    ) {
      setServiceDetails(data.serviceDetails);
    } else {
      setServiceDetails({});
    }

    setLoading(false);
  }

  // -----------------------------------
  // TOGGLE SERVICE
  // -----------------------------------

  function toggleService(serviceItem) {
    const serviceName = serviceItem.name;

    if (services.includes(serviceName)) {
      setServices((prev) =>
        prev.filter((service) => service !== serviceName)
      );

      setServiceDetails((prev) => {
        const copy = { ...prev };
        delete copy[serviceName];
        return copy;
      });
    } else {
      setServices((prev) => [
        ...prev,
        serviceName
      ]);

      setServiceDetails((prev) => ({
        ...prev,
        [serviceName]: {
          price: Number(serviceItem.price || 0),
          discount: 0
        }
      }));
    }
  }

  // -----------------------------------
  // UPDATE SERVICE PRICE
  // -----------------------------------

  function updateServicePrice(serviceName, price) {
    setServiceDetails((prev) => ({
      ...prev,
      [serviceName]: {
        ...(prev[serviceName] || {}),
        price: Number(price || 0)
      }
    }));
  }

  // -----------------------------------
  // UPDATE SERVICE DISCOUNT
  // -----------------------------------

  function updateServiceDiscount(serviceName, discount) {
    setServiceDetails((prev) => ({
      ...prev,
      [serviceName]: {
        ...(prev[serviceName] || {}),
        discount: Number(discount || 0)
      }
    }));
  }

  // -----------------------------------
  // SAVE JOB
  // -----------------------------------
async function deletePayment(paymentId) {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this payment?"
  );

  if (!confirmDelete) {
    return;
  }

  try {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId);

    if (error) {
      console.error("DELETE PAYMENT ERROR:", error);
      alert(error.message);
      return;
    }

    // Remove payment from screen immediately
    setPayments((prev) =>
      prev.filter((payment) => payment.id !== paymentId)
    );

    // Get remaining payments
    const { data: remainingPayments, error: loadError } =
      await supabase
        .from("payments")
        .select("amount")
        .eq("job_id", Number(id));

    if (loadError) {
      console.error(
        "LOAD REMAINING PAYMENTS ERROR:",
        loadError
      );
      alert(loadError.message);
      return;
    }

    // Calculate new deposit
    const totalPaid = (remainingPayments || []).reduce(
      (sum, payment) =>
        sum + Number(payment.amount || 0),
      0
    );

    // Calculate current job total
    const { data: jobData, error: jobError } =
      await supabase
        .from("jobs")
        .select("price, discount")
        .eq("id", Number(id))
        .single();

    if (jobError) {
      console.error(
        "LOAD JOB TOTAL ERROR:",
        jobError
      );
      alert(jobError.message);
      return;
    }

    const totalPrice = Number(jobData.price || 0);
    const totalDiscount = Number(jobData.discount || 0);

    const finalTotal = Math.max(
      totalPrice - totalDiscount,
      0
    );

    const newBalance = Math.max(
      finalTotal - totalPaid,
      0
    );

    // Update job payment summary
    const { error: updateError } =
      await supabase
        .from("jobs")
        .update({
          deposit: totalPaid,
          balance: newBalance
        })
        .eq("id", Number(id));

    if (updateError) {
      console.error(
        "UPDATE BALANCE ERROR:",
        updateError
      );
      alert(updateError.message);
      return;
    }

    alert(
      `Payment deleted.\nNew Balance: QAR ${newBalance}`
    );

  } catch (error) {
    console.error(
      "DELETE PAYMENT ERROR:",
      error
    );

    alert( error.message || "Something went wrong while deleting the payment." ); } }
  async function save() {
    if (saving) return;

    setSaving(true);

    try {
      // -----------------------------------
      // 1. CALCULATE TOTAL PRICE + DISCOUNT
      // -----------------------------------

      const totals = services.reduce(
        (result, serviceName) => {
          const details =
            serviceDetails[serviceName] || {};

          const price = Number(details.price || 0);
          const discount = Number(details.discount || 0);

          result.price += price;
          result.discount += discount;

          return result;
        },
        {
          price: 0,
          discount: 0
        }
      );

      const totalPrice = totals.price;
      const totalDiscount = totals.discount;

      // -----------------------------------
      // 2. CALCULATE FINAL TOTAL
      // -----------------------------------

      const finalTotal = Math.max(
        totalPrice - totalDiscount,
        0
      );

      // -----------------------------------
      // 3. SOURCE
      // -----------------------------------

      const finalSource =
        source === "Other"
          ? otherSource.trim()
          : source;

      // -----------------------------------
      // 4. ADD PAYMENT IF ENTERED
      // -----------------------------------

      const amount = Number(paymentAmount || 0);

      if (amount > 0) {
        const { error: paymentError } = await supabase
          .from("payments")
          .insert({
            job_id: Number(id),
            amount: amount,
            payment_method: paymentMethod,
            payment_date: paymentDate,
            notes: paymentNotes.trim() || null
          });

        if (paymentError) {
          console.error(
            "PAYMENT ERROR:",
            paymentError
          );

          throw new Error(
            "Payment could not be saved: " +
            paymentError.message
          );
        }
      }

      // -----------------------------------
      // 5. GET ALL PAYMENTS
      // -----------------------------------

      const {
        data: paymentData,
        error: paymentLoadError
      } = await supabase
        .from("payments")
        .select("amount")
        .eq("job_id", Number(id));

      if (paymentLoadError) {
        throw new Error(
          "Could not calculate payment balance: " +
          paymentLoadError.message
        );
      }

      // -----------------------------------
      // 6. TOTAL PAID
      // -----------------------------------

      const totalPaid = (paymentData || []).reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

      // -----------------------------------
      // 7. NEW BALANCE
      // -----------------------------------

      const balance = Math.max(
        finalTotal - totalPaid,
        0
      );

      console.log(
        "========== SAVING JOB =========="
      );

      console.log("JOB ID:", id);
      console.log("TOTAL PRICE:", totalPrice);
      console.log("TOTAL DISCOUNT:", totalDiscount);
      console.log("FINAL TOTAL:", finalTotal);
      console.log("TOTAL PAID:", totalPaid);
      console.log("NEW BALANCE:", balance);

      // -----------------------------------
      // 8. UPDATE JOB
      // -----------------------------------

      const {
        data: updatedJob,
        error: jobError
      } = await supabase
        .from("jobs")
        .update({
          customer,
          phone,
          source: finalSource,

          carModel,
          carType,
          color,
          plate,

          services,
          serviceDetails,

          price: totalPrice,
          discount: totalDiscount,

          deposit: totalPaid,
          balance: balance
        })
        .eq("id", Number(id))
        .select()
        .single();

      if (jobError) {
        console.error(
          "JOB UPDATE ERROR:",
          jobError
        );

        throw new Error(
          "Job could not be saved: " +
          jobError.message
        );
      }

      console.log(
        "========== DATABASE RESULT =========="
      );

      console.log(
        "DATABASE PRICE:",
        updatedJob.price
      );

      console.log(
        "DATABASE DISCOUNT:",
        updatedJob.discount
      );

      console.log(
        "DATABASE DEPOSIT:",
        updatedJob.deposit
      );

      console.log(
        "DATABASE BALANCE:",
        updatedJob.balance
      );

      // -----------------------------------
      // 9. CLEAR PAYMENT FORM
      // -----------------------------------

      setPaymentAmount("");
      setPaymentMethod("Visa");

      setPaymentDate(
        new Date().toISOString().split("T")[0]
      );

      setPaymentNotes("");

      // -----------------------------------
      // 10. SUCCESS
      // -----------------------------------

      alert(
        amount > 0
          ? "Job and payment saved successfully!"
          : "Job updated successfully!"
      );

      navigate(`/jobs/${id}`);

    } catch (error) {
      console.error(
        "SAVE JOB ERROR:",
        error
      );

      alert(
        error.message ||
        "Something went wrong."
      );

    } finally {
      setSaving(false);
    }
  }
async function loadPayments() {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("job_id", Number(id))
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("LOAD PAYMENTS ERROR:", error);
    return;
  }

  setPayments(data || []);
}
  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (loading) {
    return <div>Loading...</div>;
  }

  // -----------------------------------
  // PAGE
  // -----------------------------------

  return (

    <div style={styles.page}>

      <h2>Edit Job #{id}</h2>

      {/* CUSTOMER */}

      <input
        value={customer}
        onChange={(e) =>
          setCustomer(e.target.value)
        }
        placeholder="Customer"
        style={styles.input}
      />

      <input
        value={phone}
        onChange={(e) =>
          setPhone(e.target.value)
        }
        placeholder="Phone"
        style={styles.input}
      />

      <input
        value={carModel}
        onChange={(e) =>
          setCarModel(e.target.value)
        }
        placeholder="Model"
        style={styles.input}
      />

      <input
        value={carType}
        onChange={(e) =>
          setCarType(e.target.value)
        }
        placeholder="Type"
        style={styles.input}
      />

      <input
        value={color}
        onChange={(e) =>
          setColor(e.target.value)
        }
        placeholder="Color"
        style={styles.input}
      />

      <input
        value={plate}
        onChange={(e) =>
          setPlate(e.target.value)
        }
        placeholder="Plate"
        style={styles.input}
      />

      {/* SOURCE */}

      <label style={{ fontWeight: "bold" }}>
        Source
      </label>

      <select
        value={source}
        onChange={(e) =>
          setSource(e.target.value)
        }
        style={styles.sourceSelect}
      >
        <option value="">
          Select Source
        </option>

        <option value="Teyseer Motors">
          Teyseer Motors
        </option>

        <option value="Teyseer Motors - Bahaa">
          Teyseer Motors - Bahaa
        </option>

        <option value="Teyseer Motors - Salah">
          Teyseer Motors - Salah
        </option>

        <option value="Bahaa">
          Bahaa
        </option>

        <option value="Salah">
          Salah
        </option>

        <option value="Walk-in">
          Walk-in
        </option>

        <option value="Other">
          Other
        </option>
      </select>

      {source === "Other" && (
        <input
          value={otherSource}
          onChange={(e) =>
            setOtherSource(e.target.value)
          }
          placeholder="Enter source"
          style={styles.input}
        />
      )}

      {/* SERVICES */}

      <h3>Services</h3>

      {serviceList.map((item) => {
        const selected =
          services.includes(item.name);

        const details =
          serviceDetails[item.name] || {
            price: item.price || 0,
            discount: 0
          };

        return (
          <div
            key={item.id}
            style={styles.serviceBox}
          >

            <label>

              <input
                type="checkbox"
                checked={selected}
                onChange={() =>
                  toggleService(item)
                }
              />

              {" "}

              {item.name}

            </label>

            {selected && (
              <div style={styles.serviceDetails}>

                <label>
                  Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={details.price || 0}
                  onChange={(e) =>
                    updateServicePrice(
                      item.name,
                      e.target.value
                    )
                  }
                  style={styles.input}
                />

                <label>
                  Discount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={details.discount || 0}
                  onChange={(e) =>
                    updateServiceDiscount(
                      item.name,
                      e.target.value
                    )
                  }
                  style={styles.input}
                />

                <div>
                  Final: QAR{" "}
                  {Math.max(
                    Number(details.price || 0) -
                      Number(details.discount || 0),
                    0
                  )}
                </div>

              </div>
            )}

          </div>
        );
      })}

      {/* TOTAL */}

      <div style={styles.total}>

        Total: QAR{" "}

        {services.reduce(
          (sum, serviceName) => {
            const details =
              serviceDetails[serviceName] || {};

            return (
              sum +
              Math.max(
                Number(details.price || 0) -
                  Number(details.discount || 0),
                0
              )
            );
          },
          0
        )}

      </div>
{/* EXISTING PAYMENTS */}

<div style={styles.paymentBox}>

  <h3>Payment History</h3>

  {payments.length === 0 ? (
    <p>No payments recorded.</p>
  ) : (
    payments.map((payment) => (
      <div
        key={payment.id}
        style={styles.paymentRow}
      >

        <div>
          <strong>
            QAR {Number(payment.amount || 0).toFixed(2)}
          </strong>

          <div>
            Method: {payment.payment_method || "N/A"}
          </div>

          <div>
            Date: {payment.payment_date || "N/A"}
          </div>

          {payment.notes && (
            <div>
              Notes: {payment.notes}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            deletePayment(payment.id)
          }
          style={styles.deletePaymentButton}
        >
          🗑 Delete Payment
        </button>

      </div>
    ))
  )}

</div>
      {/* PAYMENT */}

      <div style={styles.paymentBox}>

        <h3>Make Payment</h3>

        <label>
          Payment Amount
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={paymentAmount}
          onChange={(e) =>
            setPaymentAmount(e.target.value)
          }
          placeholder="Enter payment amount"
          style={styles.input}
        />

        <label>
          Payment Method
        </label>

        <select
          value={paymentMethod}
          onChange={(e) =>
            setPaymentMethod(e.target.value)
          }
          style={styles.sourceSelect}
        >

          <option value="Visa">
            Visa
          </option>

          <option value="Mastercard">
            Mastercard
          </option>

          <option value="PayLater">
            PayLater
          </option>

          <option value="Cash">
            Cash
          </option>

          <option value="Bank Transfer">
            Bank Transfer
          </option>

        </select>

        <label>
          Payment Date
        </label>

        <input
          type="date"
          value={paymentDate}
          onChange={(e) =>
            setPaymentDate(e.target.value)
          }
          style={styles.input}
        />

        <label>
          Notes
        </label>

        <input
          value={paymentNotes}
          onChange={(e) =>
            setPaymentNotes(e.target.value)
          }
          placeholder="Payment notes"
          style={styles.input}
        />

      </div>

      {/* SAVE */}

      <button
        onClick={save}
        disabled={saving}
        style={{
          ...styles.saveButton,
          opacity: saving ? 0.6 : 1
        }}
      >
        {saving
          ? "SAVING..."
          : "SAVE CHANGES"}
      </button>

    </div>
  );
}

const styles = {
  page: {
    padding: "30px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxWidth: "600px"
  },

  serviceBox: {
    padding: "15px",
    border: "1px solid #ddd",
    borderRadius: "10px"
  },

  serviceDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "10px",
    paddingLeft: "25px"
  },

  paymentBox: {
    marginTop: "20px",
    padding: "20px",
    border: "2px solid #2563eb",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  total: {
    fontSize: "20px",
    fontWeight: "bold",
    marginTop: "10px"
  },

  saveButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  sourceSelect: {
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    background: "white",
    color: "#111",
    fontSize: "15px",
    cursor: "pointer"
  },

  input: {
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    fontSize: "15px"
  },
  paymentRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  padding: "15px",
  marginBottom: "10px",
  background: "#f8fafc",
  border: "1px solid #ddd",
  borderRadius: "10px"
},

deletePaymentButton: {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "9px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold"
},
};

export default EditJob;