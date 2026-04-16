import json
from datetime import datetime, timezone
from sqlalchemy import Integer, String, Boolean, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


def _now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id:           Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    email:        Mapped[str]      = mapped_column(String(254), nullable=False, unique=True, index=True)
    name:         Mapped[str]      = mapped_column(String(200), default="")
    hashed_pw:    Mapped[str]      = mapped_column(String(200), nullable=False)
    is_active:    Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:   Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # Sender profile — used to personalise outreach emails
    sender_title:       Mapped[str] = mapped_column(String(200), default="")   # e.g. "Head of Sales"
    company_name:       Mapped[str] = mapped_column(String(200), default="")   # e.g. "Acme Inc."
    product_description:Mapped[str] = mapped_column(Text,        default="")   # what you sell
    value_proposition:  Mapped[str] = mapped_column(String(500), default="")   # one-line value prop
    website:            Mapped[str] = mapped_column(String(500), default="")   # your company website

    def to_dict(self):
        return {
            "id":                  self.id,
            "email":               self.email,
            "name":                self.name,
            "isActive":            self.is_active,
            "createdAt":           self.created_at.isoformat() if self.created_at else "",
            "senderTitle":         self.sender_title,
            "companyName":         self.company_name,
            "productDescription":  self.product_description,
            "valueProposition":    self.value_proposition,
            "website":             self.website,
        }

    def profile_complete(self) -> bool:
        return bool(self.company_name and self.product_description)


class Lead(Base):
    __tablename__ = "leads"

    id:                Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    company:           Mapped[str]  = mapped_column(String(200))
    website:           Mapped[str]  = mapped_column(String(500), default="")
    industry:          Mapped[str]  = mapped_column(String(200), default="")
    size:              Mapped[str]  = mapped_column(String(100), default="")
    location:          Mapped[str]  = mapped_column(String(200), default="")
    funding_stage:     Mapped[str]  = mapped_column(String(100), default="")
    contact_name:      Mapped[str]  = mapped_column(String(200), default="")
    contact_title:     Mapped[str]  = mapped_column(String(200), default="")
    contact_email:     Mapped[str]  = mapped_column(String(254), default="")

    # Scores
    score:             Mapped[int]  = mapped_column(Integer, default=0)
    tech_fit:          Mapped[int]  = mapped_column(Integer, default=0)
    size_fit:          Mapped[int]  = mapped_column(Integer, default=0)
    timing:            Mapped[int]  = mapped_column(Integer, default=0)
    growth_indicators: Mapped[int]  = mapped_column(Integer, default=0)
    score_reasoning:   Mapped[str]  = mapped_column(Text, default="")

    status:            Mapped[str]  = mapped_column(String(50), default="Not Contacted")
    date_added:        Mapped[str]  = mapped_column(String(20), default="")

    # Long text fields
    icp_fit:           Mapped[str]  = mapped_column(Text, default="")
    summary:           Mapped[str]  = mapped_column(Text, default="")
    recent_news:       Mapped[str]  = mapped_column(Text, default="")

    # Competitor
    uses_competitor:   Mapped[bool] = mapped_column(Boolean, default=False)
    competitor_name:   Mapped[str]  = mapped_column(String(200), default="")

    # JSON arrays stored as text
    tech_stack:        Mapped[str]  = mapped_column(Text, default="[]")
    competitors:       Mapped[str]  = mapped_column(Text, default="[]")
    pain_points:       Mapped[str]  = mapped_column(Text, default="[]")
    growth_signals:    Mapped[str]  = mapped_column(Text, default="[]")
    tags:              Mapped[str]  = mapped_column(Text, default="[]")
    sources:           Mapped[str]  = mapped_column(Text, default="[]")

    created_at:        Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    emails: Mapped[list["Email"]] = relationship(
        "Email", back_populates="lead", cascade="all, delete-orphan", order_by="Email.created_at"
    )

    def to_dict(self):
        return {
            "id":               self.id,
            "company":          self.company,
            "website":          self.website,
            "industry":         self.industry,
            "size":             self.size,
            "location":         self.location,
            "fundingStage":     self.funding_stage,
            "contactName":      self.contact_name,
            "contactTitle":     self.contact_title,
            "contactEmail":     self.contact_email,
            "score":            self.score,
            "techFit":          self.tech_fit,
            "sizeFit":          self.size_fit,
            "timing":           self.timing,
            "growthIndicators": self.growth_indicators,
            "scoreReasoning":   self.score_reasoning,
            "status":           self.status,
            "dateAdded":        self.date_added,
            "icpFit":           self.icp_fit,
            "summary":          self.summary,
            "recentNews":       self.recent_news,
            "usesCompetitor":   self.uses_competitor,
            "competitorName":   self.competitor_name,
            "techStack":        json.loads(self.tech_stack  or "[]"),
            "competitors":      json.loads(self.competitors or "[]"),
            "painPoints":       json.loads(self.pain_points or "[]"),
            "growthSignals":    json.loads(self.growth_signals or "[]"),
            "tags":             json.loads(self.tags    or "[]"),
            "sources":          json.loads(self.sources or "[]"),
            "emails":           [e.to_dict() for e in self.emails],
        }


class Email(Base):
    __tablename__ = "emails"

    id:         Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    lead_id:    Mapped[int]  = mapped_column(Integer, ForeignKey("leads.id", ondelete="CASCADE"))
    subject:    Mapped[str]  = mapped_column(String(500), default="")
    body:       Mapped[str]  = mapped_column(Text, default="")
    tone:       Mapped[str]  = mapped_column(String(50), default="")
    variant:    Mapped[str]  = mapped_column(String(5), default="A")
    sent_at:    Mapped[str]  = mapped_column(String(30), default="")
    opened:     Mapped[bool] = mapped_column(Boolean, default=False)
    clicked:    Mapped[bool] = mapped_column(Boolean, default=False)
    replied:    Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="emails")

    def to_dict(self):
        return {
            "id":        self.id,
            "leadId":    self.lead_id,
            "subject":   self.subject,
            "body":      self.body,
            "tone":      self.tone,
            "variant":   self.variant,
            "sentAt":    self.sent_at,
            "opened":    self.opened,
            "clicked":   self.clicked,
            "replied":   self.replied,
            "createdAt": self.created_at.isoformat() if self.created_at else "",
        }
