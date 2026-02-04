import React from "react";
import { useTranslation } from "react-i18next";
import AboutSectionDetail from "../../../src/components/AboutSectionDetail";

export default function ClubAbout() {
    const { t } = useTranslation();

    const sections = [
        {
            title: t("about.sections.club.services.title"),
            content: t("about.sections.club.services.content"),
            icon: "briefcase"
        },
        {
            title: t("about.sections.club.guarantee.title"),
            content: t("about.sections.club.guarantee.content"),
            icon: "checkmark-seal"
        },
        {
            title: t("about.sections.club.curated.title"),
            content: t("about.sections.club.curated.content"),
            icon: "map"
        }
    ];

    return (
        <AboutSectionDetail
            title={t("about.sections.club.title")}
            intro={t("about.sections.club.intro")}
            sections={sections}
        />
    );
}
