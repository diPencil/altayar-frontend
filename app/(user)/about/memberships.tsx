import React from "react";
import { useTranslation } from "react-i18next";
import AboutSectionDetail from "../../../src/components/AboutSectionDetail";

export default function MembershipsAbout() {
    const { t } = useTranslation();

    const sections = [
        {
            title: t("about.sections.memberships.tiers.title"),
            content: t("about.sections.memberships.tiers.content"),
            icon: "layers"
        },
        {
            title: t("about.sections.memberships.benefits.title"),
            content: t("about.sections.memberships.benefits.content"),
            icon: "gift"
        },
        {
            title: t("about.sections.memberships.loyalty.title"),
            content: t("about.sections.memberships.loyalty.content"),
            icon: "star"
        }
    ];

    return (
        <AboutSectionDetail
            title={t("about.sections.memberships.title")}
            intro={t("about.sections.memberships.intro")}
            sections={sections}
        />
    );
}
