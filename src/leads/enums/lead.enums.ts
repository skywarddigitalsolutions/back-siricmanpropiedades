/** Origin of a lead: the form the visitor used. */
export enum LeadType {
  PROPERTY_INQUIRY = 'property_inquiry',
  APPRAISAL = 'appraisal',
  CONTACT = 'contact',
}

/** Progress of a lead in the admin inbox. */
export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  CLOSED = 'closed',
}

/** What a general contact message is about (contact form). */
export enum LeadTopic {
  BUY = 'buy',
  RENT = 'rent',
  SELL = 'sell',
  CONSORTIUM = 'consortium',
  /** Property owners asking for rental administration. */
  RENTAL_MANAGEMENT = 'rental_management',
  OTHER = 'other',
}
