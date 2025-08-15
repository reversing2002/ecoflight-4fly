/**
 * 4Fly SDK Simplifié - Authentification Utilisateur
 *
 * Architecture simplifiée qui utilise l'authentification utilisateur 4Fly standard
 * au lieu de tokens d'application séparés.
 */

const { createClient } = require("@supabase/supabase-js");

class FourFlySimpleSDK {
  constructor(config) {
    const { supabaseUrl, supabaseAnonKey, userToken } = config;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Configuration Supabase requise: supabaseUrl et supabaseAnonKey"
      );
    }

    // Conserver la configuration pour recréer le client avec un token utilisateur
    this.config = { supabaseUrl, supabaseAnonKey };

    // Client Supabase avec authentification utilisateur standard
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Si un token utilisateur est fourni, l'utiliser
    if (userToken) {
      this.setUserToken(userToken);
    }

    this.currentUser = null;
    this.currentClubId = null;
  }

  /**
   * Définir le token d'authentification utilisateur
   */
  async setUserToken(token) {
    // Recréer un client Supabase "impersonifié" par le JWT utilisateur
    this.supabase = createClient(
      this.config.supabaseUrl,
      this.config.supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Valider le token et récupérer l'utilisateur sans nécessiter de refresh token
    const { data, error } = await this.supabase.auth.getUser(token);

    if (!error && data?.user) {
      this.currentUser = data.user;
      await this._loadUserClub();
      return { success: true, error: null, user: data.user };
    }

    return {
      success: false,
      error: error?.message || "JWT invalide",
      user: null,
    };
  }

  /**
   * Connexion avec email/password
   */
  async signIn(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      this.currentUser = data.user;
      await this._loadUserClub();
    }

    return {
      success: !error,
      error: error?.message,
      user: data?.user,
      token: data?.session?.access_token || null,
    };
  }

  /**
   * Récupérer le club de l'utilisateur connecté
   */
  async _loadUserClub() {
    if (!this.currentUser) return;

    const { data, error } = await this.supabase
      .from("club_members")
      .select("club_id, clubs(name)")
      .eq("user_id", this.currentUser.id)
      .eq("is_active", true)
      .single();

    if (!error && data) {
      this.currentClubId = data.club_id;
    }
  }

  /**
   * Vérifier si l'application est installée pour le club actuel
   */
  async isAppInstalled(appId) {
    if (!this.currentClubId) return false;

    const { data, error } = await this.supabase
      .from("external_app_installations")
      .select("id")
      .eq("app_id", appId)
      .eq("club_id", this.currentClubId)
      .eq("is_active", true)
      .single();

    return !error && data;
  }

  /**
   * Logger l'utilisation de l'application
   */
  async logAppUsage(appId, action = "access") {
    if (!this.currentClubId) return;

    try {
      await this.supabase.rpc("log_app_usage", {
        p_app_id: appId,
        p_club_id: this.currentClubId,
        p_action: action,
      });
    } catch (error) {
      console.warn("Erreur lors du logging:", error);
    }
  }

  /**
   * Récupérer les vols du club (avec permissions utilisateur)
   */
  async getFlights(options = {}) {
    if (!this.currentClubId) {
      throw new Error("Utilisateur non connecté ou sans club");
    }

    const { limit = 50, offset = 0, startDate, endDate } = options;

    let query = this.supabase
      .from("flights")
      .select(
        `
        id,
        date,
        duration,
        userId,
        aircraftId,
        destination,
        fuel_added_before,
        fuel_added_after,
        landings,
        aircraft:aircraftId(
          id,
          name,
          registration,
          type,
          fuel_types!fuel_type_id(
            name,
            emission_factor
          )
        ),
        users:userId(
          first_name,
          last_name
        )
      `
      )
      .eq("club_id", this.currentClubId)
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) {
      query = query.gte("date", startDate);
    }

    if (endDate) {
      query = query.lte("date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Erreur lors de la récupération des vols: ${error.message}`
      );
    }

    return data.map((flight) => ({
      id: flight.id,
      date: flight.date,
      duration: flight.duration,
      pilot_id: flight.userId,
      pilot_name: flight.users
        ? `${flight.users.first_name} ${flight.users.last_name}`
        : "N/A",
      aircraft_id: flight.aircraftId,
      aircraft_name: flight.aircraft?.name || "Avion",
      aircraft_registration: flight.aircraft?.registration || "",
      destination: flight.destination,
      fuel_used:
        (flight.fuel_added_before || 0) + (flight.fuel_added_after || 0),
      landings: flight.landings,
      emission_factor: flight.aircraft?.fuel_types?.emission_factor || 2.31,
    }));
  }

  /**
   * Récupérer les avions du club
   */
  async getAircraft() {
    if (!this.currentClubId) {
      throw new Error("Utilisateur non connecté ou sans club");
    }

    const { data, error } = await this.supabase
      .from("aircraft")
      .select(
        `
        id,
        name,
        registration,
        type,
        hourlyRate,
        status,
        fuel_types!fuel_type_id(
          name,
          emission_factor
        )
      `
      )
      .eq("club_id", this.currentClubId);

    if (error) {
      throw new Error(
        `Erreur lors de la récupération des avions: ${error.message}`
      );
    }

    return data;
  }

  /**
   * Récupérer les membres du club (données publiques seulement)
   */
  async getMembers() {
    if (!this.currentClubId) {
      throw new Error("Utilisateur non connecté ou sans club");
    }

    const { data, error } = await this.supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .eq("club_id", this.currentClubId);

    if (error) {
      throw new Error(
        `Erreur lors de la récupération des membres: ${error.message}`
      );
    }

    return data;
  }

  /**
   * Calculer les données carbone
   */
  calculateCO2(fuelUsed, emissionFactor = 2.31) {
    return fuelUsed * emissionFactor;
  }

  calculateOffsetCost(co2Kg, pricePerTonne = 25) {
    return (co2Kg / 1000) * pricePerTonne;
  }

  /**
   * Récupérer les données carbone pour tous les vols
   */
  async getFlightCarbonData(options = {}) {
    const flights = await this.getFlights(options);

    return flights.map((flight) => {
      const co2_kg = this.calculateCO2(
        flight.fuel_used,
        flight.emission_factor
      );
      const offset_cost = this.calculateOffsetCost(co2_kg);

      return {
        ...flight,
        co2_kg,
        offset_cost,
      };
    });
  }

  /**
   * S'abonner aux nouveaux vols en temps réel
   */
  subscribeToFlights(callback) {
    if (!this.currentClubId) {
      throw new Error("Utilisateur non connecté ou sans club");
    }

    const subscription = this.supabase
      .channel("flights-subscription")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "flights",
          filter: `club_id=eq.${this.currentClubId}`,
        },
        callback
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }

  /**
   * Obtenir les informations de l'utilisateur connecté
   */
  getCurrentUser() {
    return {
      user: this.currentUser,
      clubId: this.currentClubId,
    };
  }

  /**
   * Se déconnecter
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();

    if (!error) {
      this.currentUser = null;
      this.currentClubId = null;
    }

    return { success: !error, error: error?.message };
  }
}

module.exports = FourFlySimpleSDK;
