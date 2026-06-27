using Microsoft.AspNetCore.Mvc;
using OliveLifecycle.Application.Abstractions.Services;
using OliveLifecycle.Common.Api;
using OliveLifecycle.Core.Exceptions;

namespace OliveLifecycle.API.Controllers;

[ApiController]
public abstract class BaseApiController : ControllerBase
{
    private readonly ICurrentUserContext _currentUser;

    protected BaseApiController(ICurrentUserContext currentUser)
    {
        _currentUser = currentUser;
    }

    protected AuthenticatedUser UserContext => new(_currentUser);

    protected ActionResult<T> OkResult<T>(T data) => Ok(data);

    protected ActionResult CreatedResult<T>(string actionName, object routeValues, T data) =>
        CreatedAtAction(actionName, routeValues, data);

    protected record AuthenticatedUser(ICurrentUserContext Context)
    {
        public string UserId
        {
            get
            {
                if (string.IsNullOrEmpty(Context.UserId))
                {
                    throw new ForbiddenException("User is not authenticated.");
                }

                return Context.UserId;
            }
        }

        public string Role => Context.Role;
    }
}
