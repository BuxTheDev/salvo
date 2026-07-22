import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { styles as s, BUYER } from "./theme.js";

/* Reusable building blocks shared by the Creative and Cash LOI documents.
   Text is transcribed from the BrightPath LOI templates so the merge output
   matches the originals; merge values come from buildExportRow() in ../engine.js. */

export const Para = ({ children, style }) => <Text style={style ? [s.para, style] : s.para}>{children}</Text>;
export const Section = ({ children, style }) => <Text style={style ? [s.section, style] : s.section}>{children}</Text>;
export const Bullet = ({ children }) => (
  <View style={s.bulletRow}><Text style={s.bulletDot}>{"\u2022"}</Text><Text style={s.bulletText}>{children}</Text></View>
);

export const Term = ({ label, value, note }) => (
  <View style={{ marginBottom: 3 }} wrap={false}>
    <View style={s.termRow}>
      <Text style={s.termLabel}>{label}</Text>
      <Text style={s.termValue}>{value}</Text>
    </View>
    {note ? <Text style={s.termNote}>{note}</Text> : null}
  </View>
);

export const Head = ({ title, address, date }) => (
  <View>
    <Text style={s.title}>{title}</Text>
    <Text style={s.addr}>{address}</Text>
    <Text style={s.date}>{date}</Text>
  </View>
);

export const BuyerIntro = () => (
  <>
    <Para>Dear Sir/Madam,</Para>
    <Para>
      After reviewing the information provided, {BUYER} and/or its assignee (hereinafter referred to as "Buyer")
      submits this Letter of Intent (this "Letter") to the current owner ("Seller"), care of the addressee hereof,
      to acquire the above-referenced property (the "Property") on the following terms and conditions:
    </Para>
    <Para>
      This Letter of Intent is a draft and serves as a preliminary outline of the proposed terms. All terms and
      conditions are subject to further negotiation and mutual agreement.
    </Para>
    <Section>BUYER NAME/ADDRESS:</Section>
    <Para>
      {BUYER} And/or Assigns. Buyer may assign this contract or any of its rights hereunder to any person,
      partnership, corporation, or other entity without notice to Seller. Seller's consent to such assignment is not
      necessary or required.
    </Para>
    <Text style={s.strong}>{BUYER}</Text>
  </>
);

const SigRow = () => (
  <View style={s.sigRow}>
    <View style={s.sigCell}><View style={s.sigLine} /><Text style={s.sigLbl}>Signature</Text></View>
    <View style={s.sigCell}><View style={s.sigLine} /><Text style={s.sigLbl}>Date</Text></View>
  </View>
);

export const CommonTerms = ({ compensationLabel = "COMMISSION:", compensationValue = "Buyer to pay agents' full commission." }) => (
  <>
    <Term label="PROOF OF FUNDS:" value="To be provided upon request." />
    <Term label="INSPECTION CONTINGENCY:" value="14 days from MEC (Mutually Executed Contract)" />
    <Term label="CLOSING DATE:" value="30 days from MEC" />
    <Term label="EMD DEPOSIT/DEADLINE:" value="1% of Purchase Price / 3 days from MEC" />
    <Term label="ACCESS TO PROPERTY:" value={"Vacant: Seller gives buyers unrestricted access via a contractor lockbox.\nOccupied: Seller gives buyer access with 24-hour notice."} />
    <Term label={compensationLabel} value={compensationValue} />
    <Term label="TITLE COMPANY:" value="Seller to close with buyer's title company of choice." />
    <Section>REPRESENTATIONS & WARRANTIES:</Section>
    <Para>
      Seller represents and warrants that it will disclose all knowledge and findings of the Property and its
      operations to Purchaser. The property is sold in "as-is" condition with free and clear title/warranty deed.
    </Para>
    <Section>TRANSACTION CONTINGENCIES:</Section>
    <Para>
      Buyer to pay all escrow fees, title policy, owner's policy, and HOA fees to close. These costs do not include
      back-due fees, violation fees, notary fees, liens, or commissions. Any time periods or dates in this contract
      that end or occur on a Saturday, Sunday, or national legal public holiday shall extend to the next business day.
      Property to be vacated of all personal belongings. Functional appliances included. {BUYER} reserves the right to
      record an affidavit and memorandum on this property. If the buyer cancels this contract at any time during the
      inspection period, the buyer's Earnest Money Deposit is to be refunded by title at the sole discretion of the
      buyer and does not require a signed release and cancellation from the selling party. Buyer and Seller agree that
      upon request by {BUYER}, title is to be ordered upon release of the inspection contingency.
    </Para>
    <Para>
      This Letter of Intent is an expression of the general terms upon which Buyer and Seller will consider entering
      into a binding contract, which will only come into effect upon the mutual execution of the Purchase Agreement.
      In the event that such a formal agreement is not signed within 7 days of mutual execution of this Letter, there
      is and will be no binding agreement between the Buyer and Seller.
    </Para>
  </>
);

export const Signatures = ({ ownerName }) => (
  <>
    <Section style={{ marginTop: 14 }}>PURCHASER:</Section>
    <Text style={s.strong}>{BUYER}</Text>
    <Text>and/or assignee</Text>
    <SigRow />
    <Section style={{ marginTop: 14 }}>ACKNOWLEDGED AND AGREED TO BY SELLER:</Section>
    <Text style={s.strong}>{ownerName || ""}</Text>
    <SigRow />
    <SigRow />
  </>
);

/* Creative (Subject-To + Seller Finance) letter body. */
export const CreativeSection = ({ d }) => (
  <>
    <Head title="Letter of Intent to Purchase" address={d.Address} date={d.Date} />
    <BuyerIntro />
    <Term label="PURCHASE PRICE:" value={d.Price} />
    <Term label="FUNDING:" value="Subject-To/Seller Finance" />
    <Term label="EXISTING MORTGAGE AMOUNT:" value={d["Loan Balance"]} note="(To be taken over Subject-to)" />
    <Term label="DOWN PAYMENT:" value={d.Down} />
    <Term label="SELLER FINANCED AMOUNT:" value={d.Financed} />
    <Term label="MONTHLY PAYMENT DUE TO SELLER:" value={d.Payment} />
    <Term label="ESTIMATED SUBJECT-TO PAYMENT:" value={d["Sub Payment"]} note="(Paid Via Loan Servicer)" />
    <Term label="BALLOON PAYMENT:" value="To be Determined (TBD)" />
    <Term label="INTEREST:" value="Built-Into Purchase Price" />
    <Section>NET TO SELLER BREAKDOWN:</Section>
    <Bullet>Seller profits in total using Seller Financing: {d["Seller Profit Creative"]}</Bullet>
    <Bullet>Seller profits from a traditional sale: {d["Seller Profit Traditional"]}</Bullet>
    <Bullet>Additional profit with Seller Financing: {d["Seller Profit Difference"]}</Bullet>
    <Bullet>Seller saves {d["Industry Costs"]} in industry average closing costs, ensuring the agreed price is the real price, avoiding unexpected fees at closing.</Bullet>
    <Bullet>Seller sells the property "as-is", eliminating the need for repairs, thus saving time, money, and hassle.</Bullet>
    <Bullet>Seller avoids qualifying the home for a loan at sale, bypassing the risk of closing falling apart due to a low appraisal. The estimated home value is {d["Home Value"]}.</Bullet>
    <CommonTerms compensationLabel="COMPENSATION:" compensationValue="Buyer to pay agent up to 3% compensation." />
    <Signatures ownerName={d["Owner Full Name"]} />
  </>
);

/* Cash offer letter body. `compensation*` props default to the standalone cash
   template wording; the Creative doc appends this section with the 3% variant. */
export const CashSection = ({ d, compensationLabel = "COMMISSION:", compensationValue = "Buyer to pay agents' full commission." }) => (
  <>
    <Head title="Letter of Intent to Purchase Cash Offer" address={d.Address} date={d.Date} />
    <BuyerIntro />
    <Term label="PURCHASE PRICE:" value={d["Cash Scenario"]} />
    <Term label="FUNDING:" value="CASH" />
    <Section>NET TO SELLER BREAKDOWN:</Section>
    <Bullet>Seller profits from a cash sale: {d["Net Cash"]}</Bullet>
    <Bullet>Seller saves {d["Industry Costs"]} in industry average closing costs, ensuring the agreed price is the real price, avoiding unexpected fees at closing.</Bullet>
    <Bullet>Seller sells the property "as-is", eliminating the need for repairs, thus saving time, money, and hassle.</Bullet>
    <Bullet>Seller avoids qualifying the home for a loan at sale, bypassing the risk of closing falling apart due to a low appraisal.</Bullet>
    <CommonTerms compensationLabel={compensationLabel} compensationValue={compensationValue} />
    <Signatures ownerName={d["Owner Full Name"]} />
  </>
);
