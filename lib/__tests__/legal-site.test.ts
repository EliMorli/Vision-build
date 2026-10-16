import fs from "fs";
import path from "path";

const { groupLicenses, groupTexts, parseGeneratedLicenses } = require("../../scripts/web-legal/group-licenses");
const { render } = require("../../scripts/web-legal/markdown");
const { readPolicyVersion, checkBaseUrl } = require("../../scripts/check-legal-release");

describe("legal site: license grouping", () => {
  const entries = [
    { name: "b-pkg", version: "1.0.0", license: "MIT", copyright: "Copyright (c) B", textId: "mit" },
    { name: "a-pkg", version: "2.0.0", license: "MIT", copyright: "", textId: "mit" },
    { name: "a-pkg", version: "1.0.0", license: "MIT", copyright: "", textId: "mit" },
    { name: "a-pkg", version: "0.9.0", license: "ISC", copyright: "", textId: "isc" },
  ];
  const texts = { mit: "Permission is hereby granted", isc: "Permission to use" };

  it("merges versions of the same package into one sorted group", () => {
    const groups = groupLicenses(entries);
    expect(groups.map((g: { name: string }) => g.name)).toEqual(["a-pkg", "b-pkg"]);
    expect(groups[0].versions).toEqual(["2.0.0", "1.0.0", "0.9.0"]);
    expect(groups[0].licenseTypes).toEqual(["MIT", "ISC"]);
  });

  it("prints each distinct license text once with the versions that share it", () => {
    const [a] = groupLicenses(entries);
    expect(groupTexts(a, texts)).toEqual([
      { text: "Permission is hereby granted", versions: ["2.0.0", "1.0.0"] },
      { text: "Permission to use", versions: ["0.9.0"] },
    ]);
  });

  it("parses the generated licenses file and has no duplicate package rows", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "generated", "licenses.ts"), "utf8");
    const { licenses, texts: all } = parseGeneratedLicenses(src);
    const groups = groupLicenses(licenses);
    const names = groups.map((g: { name: string }) => g.name);
    expect(new Set(names).size).toBe(names.length);
    expect(groups.find((g: { name: string }) => g.name === "@babel/code-frame").versions.length).toBeGreaterThan(1);
    expect(Object.keys(all).length).toBeGreaterThan(0);
  });
});

describe("legal site: markdown", () => {
  it("escapes HTML and renders headings, tables and links", () => {
    const { html } = render("## 6. Keep\n\n<script>x</script> [Privacy](../privacy/)\n\n| A | B |\n|---|---|\n| 1 | 2 |");
    expect(html).toContain('<h2 id="6-keep">6. Keep</h2>');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain('<a href="../privacy/">Privacy</a>');
    expect(html).toContain("<td>1</td>");
  });
});

describe("legal release gate helpers", () => {
  it("reads <meta name=policy-version> in any attribute order", () => {
    expect(readPolicyVersion('<meta name="policy-version" content="3">')).toBe("3");
    expect(readPolicyVersion("<meta content='4' name='policy-version'>")).toBe("4");
    expect(readPolicyVersion("<meta name=\"description\" content=\"x\">")).toBeNull();
  });

  it("rejects the placeholder base URL", () => {
    const prev = process.env.EXPO_PUBLIC_LEGAL_BASE_URL;
    const config = { placeholder: "https://visionbuild.app/legal", privacyVersion: "1" };
    process.env.EXPO_PUBLIC_LEGAL_BASE_URL = "https://visionbuild.app/legal/";
    expect(checkBaseUrl(config).ok).toBe(false);
    process.env.EXPO_PUBLIC_LEGAL_BASE_URL = "https://legal.example.com";
    expect(checkBaseUrl(config).ok).toBe(true);
    if (prev === undefined) delete process.env.EXPO_PUBLIC_LEGAL_BASE_URL;
    else process.env.EXPO_PUBLIC_LEGAL_BASE_URL = prev;
  });
});

describe("app legal URL config", () => {
  it("matches the release gate placeholder and builds page URLs", () => {
    const legal = require("../config/legal");
    expect(legal.LEGAL_BASE_URL_PLACEHOLDER).toBe("https://visionbuild.app/legal");
    if (!process.env.EXPO_PUBLIC_LEGAL_BASE_URL) {
      expect(legal.LEGAL_URLS).toEqual({
        terms: "https://visionbuild.app/legal/terms",
        privacy: "https://visionbuild.app/legal/privacy",
        licenses: "https://visionbuild.app/legal/licenses",
        deleteAccount: "https://visionbuild.app/legal/delete-account",
      });
    }
    const versions = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "web-legal", "versions.json"), "utf8"));
    expect(versions.privacy.current).toBe(legal.PRIVACY_POLICY_VERSION);
    expect(versions.terms.current).toBe(legal.TERMS_VERSION);
  });
});
