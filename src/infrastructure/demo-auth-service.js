export class DemoAuthService {
  constructor(sessionStorage, key = "orbit.session.v2") {
    this.sessionStorage = sessionStorage;
    this.key = key;
  }

  async signIn({ userId, password }, users) {
    if (password !== "demo123") throw new Error("The demo password is demo123.");
    const user = users.find((candidate) => candidate.id === userId);
    if (!user) throw new Error("Account not found.");
    this.sessionStorage.setItem(this.key, user.id);
    return user;
  }

  async restore(users) {
    const userId = this.sessionStorage.getItem(this.key);
    return users.find((user) => user.id === userId) || null;
  }

  async signOut() {
    this.sessionStorage.removeItem(this.key);
  }
}
