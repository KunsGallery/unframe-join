import React from "react";
import { isPrivateRef } from "../../constants/storedFiles";
import { openStoredFile } from "../../lib/privateFiles";

// A link to an uploaded file. Private applicant files have no address of their own, so they open
// through a fresh short-lived link on click; public files stay ordinary links.
const StoredFileAnchor = ({ value, className, children }) =>
  isPrivateRef(value) ? (
    <button type="button" onClick={() => openStoredFile(value)} className={className}>
      {children}
    </button>
  ) : (
    <a href={value} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );

export default StoredFileAnchor;
