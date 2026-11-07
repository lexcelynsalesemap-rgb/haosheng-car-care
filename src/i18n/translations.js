
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appName: "Haosheng Car Care System",
      dashboard: "Dashboard",
      newJob: "New Job",
      jobs: "Jobs",
      invoices: "Invoices",
      technicianEarnings: "Technician Earnings",
      assignTechnician: "Assign Technician",
      reports: "Reports",
      inventory: "Inventory",
      users: "Users",
      settings: "Settings",
      login: "Login",
      logout: "Logout",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      search: "Search",
      actions: "Actions",
      status: "Status",
      date: "Date",
      customer: "Customer",
      vehicle: "Vehicle",
      total: "Total",
      language: "Language",
      english: "English",
      arabic: "Arabic",
      chinese: "Chinese",
            workshopManagement: "Workshop Management System",
      newJobButton: "New Job",
      inventoryButton: "Inventory",
      technicianEarningsButton: "Technician Earnings",
      dashboardPeriod: "Dashboard Period",
      allTime: "All Time",
      today: "Today",
      thisYear: "This Year",
      totalJobs: "Total Jobs",
      newJobs: "New",
      inProgress: "In Progress",
      finished: "Finished",
      delivered: "Delivered",
      totalSales: "Total Sales",
      recentJobs: "Recent Jobs",
      source: "Source",
      amount: "Amount",
      statistics: "Statistics",
      noJobsFound: "No jobs found for this period."
    }
  },

  ar: {
    translation: {
      appName: "نظام هاوشينغ للعناية بالسيارات",
      dashboard: "لوحة التحكم",
      newJob: "وظيفة جديدة",
      jobs: "الوظائف",
      invoices: "الفواتير",
      technicianEarnings: "أرباح الفنيين",
      assignTechnician: "تعيين فني",
      reports: "التقارير",
      inventory: "المخزون",
      users: "المستخدمون",
      settings: "الإعدادات",
      login: "تسجيل الدخول",
      logout: "تسجيل الخروج",
      save: "حفظ",
      cancel: "إلغاء",
      edit: "تعديل",
      delete: "حذف",
      search: "بحث",
      actions: "الإجراءات",
      status: "الحالة",
      date: "التاريخ",
      customer: "العميل",
      vehicle: "المركبة",
      total: "الإجمالي",
      language: "اللغة",
      english: "الإنجليزية",
      arabic: "العربية",
      chinese: "الصينية",
            workshopManagement: "نظام إدارة ورشة السيارات",
      newJobButton: "وظيفة جديدة",
      inventoryButton: "المخزون",
      technicianEarningsButton: "أرباح الفنيين",
      dashboardPeriod: "الفترة الزمنية للوحة التحكم",
      allTime: "كل الوقت",
      today: "اليوم",
      thisYear: "هذا العام",
      totalJobs: "إجمالي الوظائف",
      newJobs: "جديد",
      inProgress: "قيد التنفيذ",
      finished: "مكتمل",
      delivered: "تم التسليم",
      totalSales: "إجمالي المبيعات",
      recentJobs: "أحدث الوظائف",
      source: "المصدر",
      amount: "المبلغ",
      statistics: "الإحصائيات",
      noJobsFound: "لا توجد وظائف لهذه الفترة."
    }
  },

  zh: {
    translation: {
      appName: "Haosheng 汽车护理管理系统",
      dashboard: "仪表板",
      newJob: "新建工单",
      jobs: "工单",
      invoices: "发票",
      technicianEarnings: "技师收入",
      assignTechnician: "分配技师",
      reports: "报表",
      inventory: "库存",
      users: "用户",
      settings: "设置",
      login: "登录",
      logout: "退出登录",
      save: "保存",
      cancel: "取消",
      edit: "编辑",
      delete: "删除",
      search: "搜索",
      actions: "操作",
      status: "状态",
      date: "日期",
      customer: "客户",
      vehicle: "车辆",
      total: "总计",
      language: "语言",
      english: "英语",
      arabic: "阿拉伯语",
      chinese: "中文",
            workshopManagement: "汽车维修中心管理系统",
      newJobButton: "新建工单",
      inventoryButton: "库存",
      technicianEarningsButton: "技师收入",
      dashboardPeriod: "仪表板时间范围",
      allTime: "全部时间",
      today: "今天",
      thisYear: "今年",
      totalJobs: "工单总数",
      newJobs: "新建",
      inProgress: "进行中",
      finished: "已完成",
      delivered: "已交付",
      totalSales: "销售总额",
      recentJobs: "最近工单",
      source: "来源",
      amount: "金额",
      statistics: "统计数据",
      noJobsFound: "此时间段没有找到工单。"
    }
  }
};

const updateDirection = (language) => {
  if (typeof document !== "undefined") {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("haosheng-language") || "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

updateDirection(i18n.language);

i18n.on("languageChanged", (language) => {
  localStorage.setItem("haosheng-language", language);
  updateDirection(language);
});

export default i18n;
