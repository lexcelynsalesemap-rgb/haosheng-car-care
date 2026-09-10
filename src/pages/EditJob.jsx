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
  const [jobDate, setJobDate] = useState("");

  // SERVICES
  const [services, setServices] = useState([]);
  const [serviceDetails, setServiceDetails] = useState({});
  const [serviceList, setServiceList] = useState([]);

  // SOURCE
  const [source, setSource] = useState("");
  const [otherSource, setOtherSource] = useState("");

  // PAYMENT
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentNotes, setPaymentNotes] = useState("");
  const [payments, setPayments] = useState([]);

  // -----------------------------------
  // TEYSEER CHECK
  // -----------------------------------

  function isTeyseerSource(sourceName) {
    return (
      sourceName === "Teyseer Motors" ||
      sourceName === "Teyseer Motors - Bahaa" ||
      sourceName === "Teyseer Motors - Salah"
    );
  }

  function isWttService(serviceName) {
    return serviceName
      ?.toLowerCase()
      .includes("wtt");
  }

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
    // JOB DATE
    // -----------------------------------

    if (data.created_at) {
      const date = new Date(data.created_at);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      setJobDate(`${year}-${month}-${day}`);
    } else {
      setJobDate(
        new Date().toISOString().split("T")[0]
      );
    }

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
        item.toLowerCase() ===
        existingSource.toLowerCase()
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
  // TOGGLE SERVICE
  // -----------------------------------

  function toggleService(serviceItem) {
    const serviceName = serviceItem.name;

    if (services.includes(serviceName)) {
      setServices((prev) =>
        prev.filter(
          (service) => service !== serviceName
        )
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
          discount: 0,
          quantity: 1,
          technicians: []
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

  function updateServiceDiscount(
    serviceName,
    discount
  ) {
    setServiceDetails((prev) => ({
      ...prev,
      [serviceName]: {
        ...(prev[serviceName] || {}),
        discount: Number(discount || 0)
      }
    }));
  }

  // -----------------------------------
  // DELETE PAYMENT
  // -----------------------------------

  async function deletePayment(paymentId) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this payment?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const { error: deleteError } =
        await supabase
          .from("payments")
          .delete()
          .eq("id", paymentId);

      if (deleteError) {
        console.error(
          "DELETE PAYMENT ERROR:",
          deleteError
        );

        alert(deleteError.message);
        return;
      }

      await recalculateJobBalance();
      await loadPayments();

      alert("Payment deleted successfully.");

    } catch (error) {
      console.error(
        "DELETE PAYMENT ERROR:",
        error
      );

      alert(
        error.message ||
        "Something went wrong."
      );
    }
  }

  // -----------------------------------
  // RECALCULATE BALANCE
  // -----------------------------------

  async function recalculateJobBalance() {
    const { data: job, error: jobError } =
      await supabase
        .from("jobs")
        .select(
          "price, discount, services, serviceDetails, source"
        )
        .eq("id", Number(id))
        .single();

    if (jobError) {
      throw new Error(
        "Could not load job totals: " +
        jobError.message
      );
    }

    const savedServices = Array.isArray(job.services)
      ? job.services
      : [];

    const savedDetails =
      job.serviceDetails &&
      typeof job.serviceDetails === "object"
        ? job.serviceDetails
        : {};

    const savedSource = job.source || "";

    // -----------------------------------
    // CUSTOMER SERVICE TOTAL
    //
    // WTT is excluded from customer's
    // payable amount for Teyseer jobs.
    // -----------------------------------

    const customerServicesTotal =
      savedServices.reduce(
        (sum, serviceName) => {
          if (
            isTeyseerSource(savedSource) &&
            isWttService(serviceName)
          ) {
            return sum;
          }

          const details =
            savedDetails[serviceName] || {};

          const price =
            Number(details.price || 0);

          const quantity =
            Number(details.quantity || 1);

          const serviceDiscount =
            Number(details.discount || 0);

          return (
            sum +
            Math.max(
              price * quantity -
                serviceDiscount,
              0
            )
          );
        },
        0
      );

   const finalTotal = Math.max(
  customerServicesTotal,
  0
);

    // -----------------------------------
    // TOTAL PAID
    // -----------------------------------

    const {
      data: paymentsData,
      error: paymentsError
    } = await supabase
      .from("payments")
      .select("amount")
      .eq("job_id", Number(id));

    if (paymentsError) {
      throw new Error(
        "Could not load payments: " +
        paymentsError.message
      );
    }

    const totalPaid =
      (paymentsData || []).reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );

    const balance = Math.max(
      finalTotal - totalPaid,
      0
    );

    // -----------------------------------
    // UPDATE JOB
    // -----------------------------------

    const {
      data: updatedJob,
      error: updateError
    } = await supabase
      .from("jobs")
      .update({
        deposit: totalPaid,
        balance: balance
      })
      .eq("id", Number(id))
      .select()
      .single();

    if (updateError) {
      throw new Error(
        "Could not update balance: " +
        updateError.message
      );
    }

    console.log(
      "BALANCE RECALCULATED:",
      updatedJob
    );

    return updatedJob;
  }

  // -----------------------------------
  // SAVE JOB
  // -----------------------------------

  async function save() {
    if (saving) return;

    setSaving(true);

    try {
      // -----------------------------------
      // CALCULATE INTERNAL TOTAL
      //
      // This includes WTT.
      // -----------------------------------

      const totals = services.reduce(
        (result, serviceName) => {
          const details =
            serviceDetails[serviceName] || {};

          const price =
            Number(details.price || 0);

          const quantity =
            Number(details.quantity || 1);

          const discount =
            Number(details.discount || 0);

          result.price +=
            price * quantity;

          result.discount +=
            discount;

          return result;
        },
        {
          price: 0,
          discount: 0
        }
      );

      // -----------------------------------
      // INTERNAL ALL SERVICES TOTAL
      // -----------------------------------

      const totalPrice = totals.price;
      const totalDiscount = totals.discount;

      const internalTotal = Math.max(
        totalPrice - totalDiscount,
        0
      );

      // -----------------------------------
      // SOURCE
      // -----------------------------------

      const finalSource =
        source === "Other"
          ? otherSource.trim()
          : source;

      // -----------------------------------
      // CUSTOMER PAYABLE TOTAL
      //
      // WTT is paid by Teyseer and is
      // therefore NOT charged to customer.
      // -----------------------------------

      const customerServicesTotal =
        services.reduce(
          (sum, serviceName) => {
            if (
              isTeyseerSource(finalSource) &&
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

            const serviceDiscount =
              Number(details.discount || 0);

            return (
              sum +
              Math.max(
                price * quantity -
                  serviceDiscount,
                0
              )
            );
          },
          0
        );

      // -----------------------------------
      // CUSTOMER NET AMOUNT
      // -----------------------------------

     const customerNetAmount = Math.max(
  customerServicesTotal,
  0
);

      // -----------------------------------
      // PAYMENT
      // -----------------------------------

      const amount =
        Number(paymentAmount || 0);

      /*
       * Payment method is only required
       * when entering a payment.
       */

      if (amount > 0 && !paymentMethod) {
        alert(
          "Please select a payment method."
        );

        setSaving(false);
        return;
      }

      // -----------------------------------
      // ADD PAYMENT
      // -----------------------------------

      if (amount > 0) {
        const {
          error: paymentError
        } = await supabase
          .from("payments")
          .insert({
            job_id: Number(id),
            amount: amount,
            payment_method: paymentMethod,
            payment_date: paymentDate,
            notes:
              paymentNotes.trim() || null
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
      // GET ALL PAYMENTS
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
      // TOTAL PAID
      // -----------------------------------

      const totalPaid =
        (paymentData || []).reduce(
          (sum, payment) =>
            sum + Number(payment.amount || 0),
          0
        );

      // -----------------------------------
      // CUSTOMER BALANCE
      //
      // WTT is already excluded above.
      // -----------------------------------

      const balance = Math.max(
        customerNetAmount - totalPaid,
        0
      );

      // -----------------------------------
      // UPDATE JOB
      //
      // price = INTERNAL TOTAL
      //
      // This keeps WTT inside the internal
      // job total while balance uses the
      // customer payable total.
      // -----------------------------------

      const {
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

          created_at: jobDate
            ? new Date(
                `${jobDate}T12:00:00`
              ).toISOString()
            : undefined,

          services,
          serviceDetails,

          // INTERNAL TOTAL
          price: internalTotal,

          // TOTAL SERVICE DISCOUNTS
          discount: totalDiscount,

          // CUSTOMER PAYMENTS ONLY
          deposit: totalPaid,

          // CUSTOMER BALANCE
          balance: balance
        })
        .eq("id", Number(id));

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

      // -----------------------------------
      // CLEAR PAYMENT FORM
      // -----------------------------------

      setPaymentAmount("");
      setPaymentMethod("");

      setPaymentDate(
        new Date().toISOString().split("T")[0]
      );

      setPaymentNotes("");

      // -----------------------------------
      // RELOAD
      // -----------------------------------

      await loadJob();
      await loadPayments();

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

  // -----------------------------------
// CALCULATED DISPLAY TOTALS
// -----------------------------------

const allServicesTotal = services.reduce(
  (sum, serviceName) => {
    const details = serviceDetails[serviceName] || {};

    const price = Number(details.price || 0);
    const quantity = Number(details.quantity || 1);
    const discount = Number(details.discount || 0);

    return sum + Math.max(price * quantity - discount, 0);
  },
  0
);

// Customer total after service discounts.
// WTT is excluded for Teyseer jobs.
const customerServicesTotal = services.reduce(
  (sum, serviceName) => {
    if (
      isTeyseerSource(source) &&
      isWttService(serviceName)
    ) {
      return sum;
    }

    const details = serviceDetails[serviceName] || {};

    const price = Number(details.price || 0);
    const quantity = Number(details.quantity || 1);
    const discount = Number(details.discount || 0);

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

// Total discounts for display/internal tracking
const totalServiceDiscount = services.reduce(
  (sum, serviceName) => {
    const details = serviceDetails[serviceName] || {};

    return (
      sum +
      Number(details.discount || 0)
    );
  },
  0
);

// IMPORTANT:
// Do NOT subtract totalServiceDiscount again.
// The discount was already removed above.
const customerNetAmount = Math.max(
  customerServicesTotal,
  0
);

const totalPaid = payments.reduce(
  (sum, payment) =>
    sum + Number(payment.amount || 0),
  0
);

const customerBalance = Math.max(
  customerNetAmount - totalPaid,
  0
);
  // -----------------------------------
  // LOADING
  // -----------------------------------

  if (loading) {
    return (
      <div style={styles.loading}>
        Loading...
      </div>
    );
  }

  // -----------------------------------
  // PAGE
  // -----------------------------------

  return (
    <div style={styles.page}>

      <div style={styles.container}>

        <h2 style={styles.title}>
          Edit Job #{id}
        </h2>

        {/* CUSTOMER */}

        <div style={styles.section}>

          <h3 style={styles.sectionTitle}>
            Customer Information
          </h3>

          <label>Customer</label>

          <input
            value={customer}
            onChange={(e) =>
              setCustomer(e.target.value)
            }
            placeholder="Customer"
            style={styles.input}
          />

          <label>Phone</label>

          <input
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
            placeholder="Phone"
            style={styles.input}
          />

          <label>Job Date</label>

          <input
            type="date"
            value={jobDate}
            onChange={(e) =>
              setJobDate(e.target.value)
            }
            style={styles.input}
          />

        </div>

        {/* VEHICLE */}

        <div style={styles.section}>

          <h3 style={styles.sectionTitle}>
            Vehicle Information
          </h3>

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

        </div>

        {/* SOURCE */}

        <div style={styles.section}>

          <h3 style={styles.sectionTitle}>
            Source
          </h3>

          <select
            value={source}
            onChange={(e) =>
              setSource(e.target.value)
            }
            style={styles.select}
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

        </div>

        {/* TEYSEER NOTICE */}

        {isTeyseerSource(source) && (
          <div style={styles.teyseerBox}>

            <strong>
              TEYSEER JOB
            </strong>

            <span>
              WTT is paid through Teyseer and is
              excluded from the customer's amount.
            </span>

          </div>
        )}

        {/* SERVICES */}

        <div style={styles.section}>

          <h3 style={styles.sectionTitle}>
            Services
          </h3>

          {serviceList.map((item) => {

            const selected =
              services.includes(item.name);

            const details =
              serviceDetails[item.name] || {
                price: item.price || 0,
                discount: 0,
                quantity: 1
              };

            const isWtt =
              isWttService(item.name);

            const isTeyseerWtt =
              isTeyseerSource(source) &&
              isWtt;

            return (
              <div
                key={item.id}
                style={styles.serviceBox}
              >

                <label style={styles.serviceLabel}>

                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      toggleService(item)
                    }
                  />

                  <span>
                    {item.name}
                  </span>

                  {isTeyseerWtt && (
                    <span
                      style={
                        styles.teyseerLabel
                      }
                    >
                      Paid through Teyseer
                    </span>
                  )}

                </label>

                {selected && (
                  <div
                    style={
                      styles.serviceDetails
                    }
                  >

                    <label>
                      Price
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        details.price || 0
                      }
                      onChange={(e) =>
                        updateServicePrice(
                          item.name,
                          e.target.value
                        )
                      }
                      style={styles.input}
                    />

                    <label>
                      Quantity
                    </label>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        details.quantity || 1
                      }
                      onChange={(e) =>
                        setServiceDetails(
                          (prev) => ({
                            ...prev,
                            [item.name]: {
                              ...(prev[
                                item.name
                              ] || {}),
                              quantity:
                                Number(
                                  e.target.value
                                ) || 1
                            }
                          })
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
                      value={
                        details.discount || 0
                      }
                      onChange={(e) =>
                        updateServiceDiscount(
                          item.name,
                          e.target.value
                        )
                      }
                      style={styles.input}
                    />

                    <div
                      style={
                        styles.finalService
                      }
                    >
                      Final: QAR{" "}
                      {Math.max(
                        Number(
                          details.price || 0
                        ) *
                          Number(
                            details.quantity || 1
                          ) -
                          Number(
                            details.discount || 0
                          ),
                        0
                      ).toFixed(2)}
                    </div>

                    {isTeyseerWtt && (
                      <div
                        style={
                          styles.teyseerServiceNotice
                        }
                      >
                        This WTT amount is paid by
                        Teyseer and is not included
                        in the customer's balance.
                      </div>
                    )}

                  </div>
                )}

              </div>
            );
          })}

        </div>

        {/* TOTAL */}

        <div style={styles.totalBox}>

          <div style={styles.total}>

            All Services Total: QAR{" "}

            {allServicesTotal.toFixed(2)}

          </div>

          {isTeyseerSource(source) && (
            <div
              style={
                styles.teyseerTotalNotice
              }
            >
              WTT is included in the internal
              total but paid through Teyseer.
            </div>
          )}

          <div
            style={
              styles.customerTotal
            }
          >
            Customer Net Amount: QAR{" "}
            {customerNetAmount.toFixed(2)}
          </div>

          <div
            style={
              styles.customerBalance
            }
          >
            Customer Balance: QAR{" "}
            {customerBalance.toFixed(2)}
          </div>

        </div>

        {/* PAYMENT HISTORY */}

        <div style={styles.paymentBox}>

          <h3 style={styles.sectionTitle}>
            Payment History
          </h3>

          {payments.length === 0 ? (

            <p style={styles.noPayments}>
              No payments recorded.
            </p>

          ) : (

            payments.map((payment) => (

              <div
                key={payment.id}
                style={styles.paymentRow}
              >

                <div>

                  <strong>
                    QAR{" "}
                    {Number(
                      payment.amount || 0
                    ).toFixed(2)}
                  </strong>

                  <div>
                    Method:{" "}
                    {payment.payment_method ||
                      "N/A"}
                  </div>

                  <div>
                    Date:{" "}
                    {payment.payment_date ||
                      "N/A"}
                  </div>

                  {payment.notes && (
                    <div>
                      Notes:{" "}
                      {payment.notes}
                    </div>
                  )}

                </div>

                <button
                  type="button"
                  onClick={() =>
                    deletePayment(
                      payment.id
                    )
                  }
                  style={
                    styles.deletePaymentButton
                  }
                >
                  🗑 Delete
                </button>

              </div>

            ))
          )}

        </div>

        {/* MAKE PAYMENT */}

        <div style={styles.makePaymentBox}>

          <h3 style={styles.sectionTitle}>
            Make Payment
          </h3>

          <p style={styles.paymentInfo}>
            If the customer has not paid yet,
            leave Payment Amount empty.
          </p>

          <label>
            Payment Amount
          </label>

          <input
            type="number"
            min="0"
            step="0.01"
            value={paymentAmount}
            onChange={(e) =>
              setPaymentAmount(
                e.target.value
              )
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
              setPaymentMethod(
                e.target.value
              )
            }
            style={styles.select}
          >

            <option value="">
              Select Payment Method
            </option>

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

          <label>
            Payment Date
          </label>

          <input
            type="date"
            value={paymentDate}
            onChange={(e) =>
              setPaymentDate(
                e.target.value
              )
            }
            style={styles.input}
          />

          <label>
            Notes
          </label>

          <input
            value={paymentNotes}
            onChange={(e) =>
              setPaymentNotes(
                e.target.value
              )
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

    </div>
  );
}

// -----------------------------------
// STYLES
// -----------------------------------

const styles = {

  page: {
    minHeight: "100vh",
    padding: "30px",
    background: "#0b0b0b",
    color: "#f5f5f5"
  },

  container: {
    width: "100%",
    maxWidth: "700px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },

  title: {
    color: "#d4af37",
    fontSize: "30px",
    marginBottom: "5px"
  },

  section: {
    background: "#151515",
    border: "1px solid #3b321c",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  sectionTitle: {
    color: "#d4af37",
    marginTop: 0,
    marginBottom: "10px"
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "8px",
    border: "1px solid #555",
    background: "#222",
    color: "#fff",
    fontSize: "16px"
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "8px",
    border: "1px solid #555",
    background: "#222",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer"
  },

  serviceBox: {
    border: "1px solid #444",
    background: "#1d1d1d",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "8px"
  },

  serviceLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "17px",
    cursor: "pointer"
  },

  serviceDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "15px",
    paddingLeft: "25px"
  },

  finalService: {
    color: "#d4af37",
    fontWeight: "bold",
    fontSize: "16px",
    marginTop: "5px"
  },

  teyseerBox: {
    background: "#241f10",
    border: "1px solid #d4af37",
    borderRadius: "12px",
    padding: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    color: "#f5f5f5"
  },

  teyseerLabel: {
    marginLeft: "5px",
    color: "#d4af37",
    fontSize: "12px",
    fontWeight: "700"
  },

  teyseerServiceNotice: {
    background: "#241f10",
    color: "#d4af37",
    padding: "9px",
    borderRadius: "7px",
    fontSize: "13px",
    fontWeight: "600",
    marginTop: "5px"
  },

  teyseerTotalNotice: {
    color: "#d4af37",
    background: "#241f10",
    padding: "10px",
    borderRadius: "8px",
    marginTop: "12px",
    fontSize: "13px",
    fontWeight: "600"
  },

  customerTotal: {
    color: "#f5f5f5",
    fontSize: "19px",
    fontWeight: "bold",
    marginTop: "15px"
  },

  customerBalance: {
    color: "#22c55e",
    fontSize: "19px",
    fontWeight: "bold",
    marginTop: "8px"
  },

  totalBox: {
    background: "#111",
    border: "2px solid #d4af37",
    borderRadius: "12px",
    padding: "18px"
  },

  total: {
    color: "#d4af37",
    fontSize: "24px",
    fontWeight: "bold"
  },

  paymentBox: {
    background: "#151515",
    border: "1px solid #3b321c",
    borderRadius: "12px",
    padding: "20px"
  },

  makePaymentBox: {
    background: "#151515",
    border: "2px solid #d4af37",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  paymentInfo: {
    color: "#aaa",
    marginTop: "-5px",
    fontSize: "14px"
  },

  noPayments: {
    color: "#999"
  },

  paymentRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "15px",
    marginBottom: "10px",
    background: "#222",
    border: "1px solid #444",
    borderRadius: "10px"
  },

  deletePaymentButton: {
    background: "#991b1b",
    color: "#fff",
    border: "none",
    padding: "9px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  saveButton: {
    background: "#d4af37",
    color: "#080808",
    border: "none",
    padding: "15px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "17px"
  },

  loading: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0b0b0b",
    color: "#d4af37",
    fontSize: "20px"
  }

};

export default EditJob;