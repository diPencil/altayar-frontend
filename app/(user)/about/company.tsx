import React from "react";
import { useTranslation } from "react-i18next";
import AboutSectionDetail from "../../../src/components/AboutSectionDetail";

export default function CompanyAbout() {
    const { t } = useTranslation();

    const sections = [
        {
            title: t("about.sections.company.history.title"),
            content: t("about.sections.company.history.content"),
            icon: "time"
        },
        {
            title: t("about.sections.company.vision.title"),
            content: t("about.sections.company.vision.content"),
            icon: "eye"
        },
        {
            title: t("about.sections.company.values.title"),
            content: t("about.sections.company.values.content"),
            icon: "heart"
        }
    ];

    return (
        <AboutSectionDetail
            title={t("about.sections.company.title")}
            intro={t("about.sections.company.intro")}
            sections={sections}
        />
    );
}
