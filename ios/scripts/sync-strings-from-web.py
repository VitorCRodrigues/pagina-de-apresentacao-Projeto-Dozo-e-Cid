#!/usr/bin/env python3
"""Builds ios/OpenDollars/Resources/Localizable.xcstrings from the web's approved copy.

The client-facing text is written and reviewed once, in web/src/i18n/locales/{es,pt,en}
(PRD section 10, voseo per decision 9). This script copies the keys the iOS app uses, converting
i18next placeholders ({{date}}) to format specifiers (%@, %lld) and i18next plurals (_one/_other)
to String Catalog plural variations. Keys only the iOS app needs are listed in IOS_ONLY below.

Usage (from the repository root):  python -I ios/scripts/sync-strings-from-web.py
Re-run after the web copy changes; never edit the generated .xcstrings by hand.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOCALES = ROOT / "web" / "src" / "i18n" / "locales"
OUTPUT = ROOT / "ios" / "OpenDollars" / "Resources" / "Localizable.xcstrings"
LANGS = ("es", "pt", "en")

# (namespace file, key path) for every web key the app uses. The iOS key is the key path.
WEB_KEYS = [
    ("translation", "app.name"),
    ("translation", "common.retry"),
    ("translation", "common.loading"),
    ("translation", "common.optional"),
    ("translation", "blockReason.quote_expired.message"),
    ("translation", "blockReason.quote_expired.action"),
    ("translation", "custody.note"),
    *[("translation", f"nav.{k}") for k in ("label", "home", "deposit", "portfolio", "pending", "profile")],
    ("translation", "states.loading"),
    ("translation", "states.error.title"),
    ("translation", "states.error.body"),
    ("translation", "states.maintenance.title"),
    ("translation", "states.maintenance.body"),
    ("translation", "states.maintenance.until"),
    ("translation", "states.sessionExpired.title"),
    ("translation", "states.sessionExpired.body"),
    ("translation", "states.sessionExpired.action"),
    *[("translation", f"session.timeout.{k}") for k in ("title", "body", "countdownLabel", "stay", "signOut")],
    *[("translation", f"timeline.status.{k}") for k in ("done", "current", "upcoming")],
    *[("translation", f"errors.{k}") for k in (
        "validation_failed", "quote_expired", "below_minimum", "account_not_open", "account_restricted",
        "compliance_hold", "market_not_live", "idempotency_conflict", "not_found", "session_expired",
        "maintenance", "rate_limited", "internal", "network", "invalid_response")],
    *[("account", f"account.title.{k}") for k in (
        "draft", "submitted", "kyc_review", "ibkr_pending", "action_required", "open", "rejected", "restricted")],
    *[("account", f"account.body.{k}") for k in ("draft", "waiting", "action_required", "open", "rejected", "restricted")],
    *[("account", f"account.timeline.{k}") for k in ("label", "submitted", "kyc_review", "ibkr_pending", "open", "actionNote")],
    *[("account", f"account.actions.{k}") for k in ("continue", "createPlan", "contact")],
    ("account", "account.accountNumber"),
    ("account", "account.documents"),
    ("portfolio", "home.title"),
    ("portfolio", "home.updatedAt"),
    ("portfolio", "home.splitLabel"),
    ("portfolio", "home.pending"),  # plural: home.pending_one / home.pending_other
    ("portfolio", "home.pendingAction"),
    ("portfolio", "portfolio.total"),
    ("portfolio", "portfolio.fees"),
    *[("portfolio", f"portfolio.bucketsShort.{k}") for k in ("invested", "ibkrCash", "inFlight")],
    ("portfolio", "portfolio.empty.title"),
    ("portfolio", "portfolio.empty.body"),
    ("portfolio", "portfolio.empty.action"),
    ("portfolio", "portfolio.asOf"),
    *[("deposit", f"deposit.amount.{k}") for k in ("label", "help", "belowMinimum", "invalidAmount")],
]

# Keys only the iOS app needs. TODO(compliance): neutral text, pending review (PRD section 10).
IOS_ONLY = {
    # TODO(decisão) 1: an AccountStatus this app version does not know.
    "account.title.unknown": {
        "es": "Estamos actualizando el estado de tu cuenta",
        "pt": "Estamos atualizando o status da sua conta",
        "en": "We are updating your account status",
    },
    "account.body.unknown": {
        "es": "Para ver el detalle, actualizá la app o escribinos.",
        "pt": "Para ver os detalhes, atualize o app ou fale com o suporte.",
        "en": "To see the details, update the app or contact support.",
    },
    # Design system catalog (DEBUG builds only, `-catalog`): section titles. Never shipped to clients.
    "devCatalog.title": {"es": "Catálogo de componentes", "pt": "Catálogo de componentes", "en": "Component catalog"},
    "devCatalog.colors": {"es": "Colores", "pt": "Cores", "en": "Colours"},
    "devCatalog.type": {"es": "Tipografía", "pt": "Tipografia", "en": "Type"},
    "devCatalog.buttons": {"es": "Botones", "pt": "Botões", "en": "Buttons"},
    "devCatalog.fields": {"es": "Campos", "pt": "Campos", "en": "Fields"},
    "devCatalog.ledger": {"es": "Líneas de extracto", "pt": "Linhas de extrato", "en": "Statement lines"},
    "devCatalog.notices": {"es": "Avisos", "pt": "Avisos", "en": "Notices"},
    "devCatalog.states": {"es": "Estados", "pt": "Estados", "en": "States"},
    # Phase 0 skeleton: tabs whose screens arrive in later phases. Never shipped to clients.
    "comingSoon.title": {"es": "Próximamente", "pt": "Em breve", "en": "Coming soon"},
    "comingSoon.body": {
        "es": "Esta sección llega en una próxima versión de la app.",
        "pt": "Esta seção chega em uma próxima versão do app.",
        "en": "This section arrives in a future version of the app.",
    },
}

PLACEHOLDER = re.compile(r"\{\{\s*(\w+)\s*\}\}")


def load(lang, namespace):
    return json.loads((LOCALES / lang / f"{namespace}.json").read_text(encoding="utf-8"))


def lookup(tree, path):
    node = tree
    for part in path.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


def convert(text):
    """i18next placeholders to format specifiers: {{count}} -> %lld, anything else -> %@."""
    return PLACEHOLDER.sub(lambda m: "%lld" if m.group(1) == "count" else "%@", text)


def unit(value):
    return {"stringUnit": {"state": "translated", "value": value}}


def main():
    strings = {}
    missing = []
    for namespace, key in WEB_KEYS:
        localizations = {}
        for lang in LANGS:
            tree = load(lang, namespace)
            value = lookup(tree, key)
            if isinstance(value, str):
                localizations[lang] = unit(convert(value))
                continue
            one, other = lookup(tree, key + "_one"), lookup(tree, key + "_other")
            if isinstance(one, str) and isinstance(other, str):
                localizations[lang] = {"variations": {"plural": {"one": unit(convert(one)), "other": unit(convert(other))}}}
                continue
            missing.append(f"{lang}:{namespace}:{key}")
        strings[key] = {"extractionState": "manual", "localizations": localizations}

    for key, values in IOS_ONLY.items():
        strings[key] = {
            "comment": "iOS only. TODO(compliance): neutral text pending review.",
            "extractionState": "manual",
            "localizations": {lang: unit(values[lang]) for lang in LANGS},
        }

    if missing:
        sys.exit("Missing in the web copy: " + ", ".join(missing))

    catalog = {"sourceLanguage": "es", "strings": dict(sorted(strings.items())), "version": "1.0"}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(strings)} keys to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
