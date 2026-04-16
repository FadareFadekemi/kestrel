import json
from sqlalchemy.orm import Session
from models import Lead, Email


def get_leads(db: Session) -> list[Lead]:
    return db.query(Lead).order_by(Lead.created_at.desc()).all()


def get_lead(db: Session, lead_id: int) -> Lead | None:
    return db.query(Lead).filter(Lead.id == lead_id).first()


def create_lead(db: Session, data: dict) -> Lead:
    """Create a lead from the tracker dict (camelCase keys from frontend)."""
    lead = Lead(
        company=          data.get("company", ""),
        website=          data.get("website", ""),
        industry=         data.get("industry", ""),
        size=             data.get("size", ""),
        location=         data.get("location", ""),
        funding_stage=    data.get("fundingStage", ""),
        contact_name=     data.get("contactName", ""),
        contact_title=    data.get("contactTitle", ""),
        contact_email=    data.get("contactEmail", ""),
        score=            data.get("score", 0),
        tech_fit=         data.get("techFit", 0),
        size_fit=         data.get("sizeFit", 0),
        timing=           data.get("timing", 0),
        growth_indicators=data.get("growthIndicators", 0),
        score_reasoning=  data.get("scoreReasoning", ""),
        status=           data.get("status", "Not Contacted"),
        date_added=       data.get("dateAdded", ""),
        icp_fit=          data.get("icp_fit", data.get("icpFit", "")),
        summary=          data.get("summary", ""),
        recent_news=      data.get("recentNews", ""),
        uses_competitor=  data.get("usesCompetitor", False),
        competitor_name=  data.get("competitorName", "") or "",
        tech_stack=       json.dumps(data.get("techStack", [])),
        competitors=      json.dumps(data.get("competitors", [])),
        pain_points=      json.dumps(data.get("painPoints", [])),
        growth_signals=   json.dumps(data.get("growthSignals", [])),
        tags=             json.dumps(data.get("tags", [])),
        sources=          json.dumps(data.get("sources", [])),
    )
    db.add(lead)
    db.flush()  # get the auto-generated id before adding emails

    for email_data in data.get("emails", []):
        email = Email(
            lead_id=  lead.id,
            subject=  email_data.get("subject", ""),
            body=     email_data.get("body", ""),
            tone=     email_data.get("tone", ""),
            variant=  email_data.get("variant", "A"),
            opened=   email_data.get("opened", False),
            clicked=  email_data.get("clicked", False),
            replied=  email_data.get("replied", False),
        )
        db.add(email)

    db.commit()
    db.refresh(lead)
    return lead


def update_lead_status(db: Session, lead_id: int, status: str) -> Lead | None:
    lead = get_lead(db, lead_id)
    if not lead:
        return None
    lead.status = status
    db.commit()
    db.refresh(lead)
    return lead


def update_lead(db: Session, lead_id: int, data: dict) -> Lead | None:
    """Partial update — only updates keys present in data."""
    lead = get_lead(db, lead_id)
    if not lead:
        return None

    field_map = {
        "status":           "status",
        "contactName":      "contact_name",
        "contactTitle":     "contact_title",
        "contactEmail":     "contact_email",
        "scoreReasoning":   "score_reasoning",
    }
    for key, col in field_map.items():
        if key in data:
            setattr(lead, col, data[key])

    db.commit()
    db.refresh(lead)
    return lead


def delete_lead(db: Session, lead_id: int) -> bool:
    lead = get_lead(db, lead_id)
    if not lead:
        return False
    db.delete(lead)
    db.commit()
    return True
