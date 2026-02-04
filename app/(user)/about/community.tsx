import React from "react";
import { useTranslation } from "react-i18next";
import AboutSectionDetail from "../../../src/components/AboutSectionDetail";

export default function CommunityAbout() {
    const { t } = useTranslation();

    const sections = [
        {
            title: t("about.sections.community.sharing.title"),
            content: t("about.sections.community.sharing.content"),
            icon: "share-social"
        },
        {
            title: t("about.sections.community.networking.title"),
            content: t("about.sections.community.networking.content"),
            icon: "chatbubbles"
        },
        {
            title: t("about.sections.community.support.title"),
            content: t("about.sections.community.support.content"),
            icon: "help-buoy"
        }
    ];

    return (
        <AboutSectionDetail
            title={t("about.sections.community.title")}
            intro={t("about.sections.community.intro")}
            sections={sections}
        />
    );
}
