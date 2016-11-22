/*
 * Licensed under the Apache License, Version 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * See https://github.com/aspnet-contrib/AspNet.Security.OAuth.Providers
 * for more information concerning the license and the contributors participating to this project.
 */

using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Authentication;
using System.Security.Claims;

namespace Mvc.Client.Extensions {
    public static class HttpContextExtensions {
        public static IEnumerable<AuthenticationDescription> GetExternalProviders(this HttpContext context) {
            if (context == null) {
                throw new ArgumentNullException(nameof(context));
            }

            return from description in context.Authentication.GetAuthenticationSchemes()
                   where !string.IsNullOrWhiteSpace(description.DisplayName)
                   select description;
        }

        public static bool IsProviderSupported(this HttpContext context, string provider) {
            if (context == null) {
                throw new ArgumentNullException(nameof(context));
            }

            return (from description in context.GetExternalProviders()
                    where string.Equals(description.AuthenticationScheme, provider, StringComparison.OrdinalIgnoreCase)
                    select description).Any();
        }
    }

    public static class GitHubExtensions
    {
        public static string GetFullName(this ClaimsPrincipal user)
        {
            foreach(var claim in user.Claims)
            {
                if (claim.Type == "urn:github:name")
                    return claim.Value;
            }
            return user.Identity.Name;
        }

        public static string GetProfileUrl(this ClaimsPrincipal user)
        {
            foreach (var claim in user.Claims)
            {
                if (claim.Type == "urn:github:url")
                    return claim.Value;
            }
            return string.Empty;
        }

        public static string GetAvatarUrl(this ClaimsPrincipal user)
        {
            foreach (var claim in user.Claims)
            {
                if (claim.Type == "urn:github:avatar_url")
                    return claim.Value;
            }
            return string.Empty;
        }
    }
}
    