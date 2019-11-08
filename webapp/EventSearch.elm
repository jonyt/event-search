module EventSearch exposing (..)

import Browser exposing (element)
import Html exposing (..)
import Html.Attributes exposing (href, placeholder, value, type_)
import Html.Events.Extra exposing (onEnter)
import Html.Events exposing (onClick, onInput)
import Date exposing (Date)
import DatePicker exposing (..)
import Http exposing (get, Error)
import Json.Decode exposing (Decoder, list, string, decodeString)

type alias Event = {
    name: String
    , description: String
    , location: String
    , source: String
    , time: Int
    }

type alias Model = {
    freeText : String
    , city : String
    , source : String 
    , fromDatePicker : DatePicker 
    , fromDate: Maybe Date 
    , toDatePicker : DatePicker 
    , toDate: Maybe Date 
    , events: List Event
    , cities: List String
    }

type Msg = Submit |
  Change String |
  EnterPressed |
  ToStartDatePicker DatePicker.Msg |
  ToEndDatePicker DatePicker.Msg |
  GotCities (Result Http.Error (List String))

getCities : Cmd Msg
getCities = Http.get { url = "http://localhost:8080/cities", expect = Http.expectJson GotCities cityDecoder}

cityDecoder : Decoder (List String)
cityDecoder = list string

init : (Model, Cmd Msg)
init = 
  let
      (datePickerFrom, datePickerCmdFrom) = DatePicker.init
      (datePickerTo, datePickerCmdTo) = DatePicker.init
  in
  ({
    freeText = ""
    , city = ""
    , source = ""
    , fromDatePicker = datePickerFrom
    , fromDate = Nothing   
    , toDatePicker = datePickerTo
    , toDate = Nothing
    , events = []
    , cities = ["All"]
  }, Cmd.batch [Cmd.map ToStartDatePicker datePickerCmdFrom, Cmd.map ToEndDatePicker datePickerCmdTo, getCities])

-- View
view : Model -> Html Msg
view model =
    div [] [
       h2 [] [ text "Search for events" ]
       , input [ placeholder "Search", onInput Change ] []
       , select [] (List.map (\x -> option [value x] [text x])  model.cities)
       , select [] (List.map (\x -> option [value x] [text x])  ["Katedra"])
       , DatePicker.view model.fromDate defaultSettings model.fromDatePicker |> Html.map ToStartDatePicker
       , DatePicker.view model.toDate defaultSettings model.toDatePicker |> Html.map ToEndDatePicker
       , button [onClick Submit ] [ text "Submit" ]
    ]

-- Update
update : Msg -> Model -> (Model, Cmd Msg)
update msg model =
  case msg of
    Change str ->
      ({ model | freeText = str }, Cmd.none)
    Submit ->
      (model, Cmd.none)
    EnterPressed ->
      (model, Cmd.none)
    ToStartDatePicker subMsg ->
      let
        ( newDatePicker, dateEvent ) =
            DatePicker.update defaultSettings subMsg model.fromDatePicker
        newDate =
            case dateEvent of
                Picked changedDate ->
                    Just changedDate
                _ ->
                    model.fromDate
      in
      ( { model
          | fromDate = newDate
          , fromDatePicker = newDatePicker
        }
      , Cmd.none
      )
    ToEndDatePicker subMsg ->
      let
        ( newDatePicker, dateEvent ) =
            DatePicker.update defaultSettings subMsg model.toDatePicker
        newDate =
          case dateEvent of
            Picked changedDate ->
              Just changedDate
            _ ->
              model.toDate
      in
      ( { model
          | toDate = newDate
          , toDatePicker = newDatePicker
        }
      , Cmd.none
      )
    GotCities result ->
      case result of
        Ok cities ->
          ({model | cities = cities}, Cmd.none)
        Err _ ->
          (model, Cmd.none)

-- Main
main : Program () Model Msg
main =
    element
        { init = \_ -> init
        , view = view
        , update = update
        , subscriptions = (\_ -> Sub.none)
        }