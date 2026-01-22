// This file is used for local testing to ensure the app uses local storage and shows a warning.
// It can be imported or used as a reference for local testing configurations.

export const IS_LOCAL_TESTING = true;

if (IS_LOCAL_TESTING) {
  console.warn("RUNNING IN LOCAL TESTING MODE");
}
