
import { useTranslation } from "react-i18next";

function LanguageSelector() {
  const { i18n } = useTranslation();

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  return (
    <div className="language-selector">
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        aria-label="Select language"
      >
        <option value="en">🇬🇧 English</option>
        <option value="ar">🇶🇦 العربية</option>
        <option value="zh">🇨🇳 中文</option>
      </select>
    </div>
  );
}

export default LanguageSelector;
